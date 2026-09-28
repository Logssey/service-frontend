import { io, type Socket } from 'socket.io-client'
import { authSession } from '@/features/auth/model/authStore'
import { recoverSession } from '@/shared/api/http'

/** 방 하나에 대해 화면이 받는 신호. 내용은 REST로 다시 읽는다(useChatRoomRealtime). */
export type ChatRoomEvent = 'joined' | 'message' | 'read' | 'message_deleted'

type Listener = (event: ChatRoomEvent) => void

export interface ChatSocketDependencies {
  createSocket: () => Socket
  getAccessToken: () => string | null
  recoverSession: () => Promise<boolean>
}

const RETRY_BASE_MS = 1_000
const RETRY_MAX_MS = 30_000
// 재발급한 토큰으로도 INVALID가 이어지면 정지·탈퇴처럼 토큰으로 풀 수 없는 상태다
const MAX_INVALID_IN_A_ROW = 2

function field(payload: unknown, name: string): unknown {
  return typeof payload === 'object' && payload !== null
    ? (payload as Record<string, unknown>)[name]
    : undefined
}

/**
 * 채팅 게이트웨이(service-backend/chat-server) 연결 하나를 화면 여러 곳이 나눠 쓴다.
 *
 * 게이트웨이는 토큰을 URL·handshake에 담으면 연결을 거부하므로, 연결한 뒤 authenticate 이벤트로 보낸다.
 * 인증되면 열려 있는 방을 모두 다시 구독한다. 서버가 끊은 연결(인증 실패, 재배포)은
 * socket.io가 스스로 다시 붙지 않아서 여기서 다시 연결한다.
 */
export class ChatSocketClient {
  private socket: Socket | null = null
  private authenticated = false
  private sentToken: string | null = null
  private authError: unknown = null
  private failures = 0
  private invalidInARow = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private readonly rooms = new Map<number, Set<Listener>>()

  constructor(private readonly deps: ChatSocketDependencies) {}

  subscribe(chatRoomId: number, listener: Listener): () => void {
    let listeners = this.rooms.get(chatRoomId)
    if (!listeners) {
      listeners = new Set()
      this.rooms.set(chatRoomId, listeners)
      this.join(chatRoomId)
    }
    listeners.add(listener)
    this.open()

    return () => {
      const current = this.rooms.get(chatRoomId)
      if (!current?.delete(listener) || current.size > 0) return
      this.rooms.delete(chatRoomId)
      if (this.authenticated) this.socket?.emit('unsubscribe', { chatRoomId })
      if (this.rooms.size === 0) this.close()
    }
  }

  /**
   * 로그아웃·탈퇴 뒤 연결을 끊는다. 게이트웨이는 토큰 서명만 보므로 서버가 대신 끊어 주지 않는다(ADR-005).
   * 구독 중인 방도 모두 잊는다. 남은 해제 함수는 부르더라도 아무 일도 하지 않는다.
   */
  disconnect() {
    this.rooms.clear()
    this.close()
  }

  private open() {
    if (this.socket || this.rooms.size === 0 || !this.deps.getAccessToken()) return
    const socket = this.deps.createSocket()
    this.socket = socket

    socket.on('connect', () => {
      const token = this.deps.getAccessToken()
      if (!token) {
        this.close()
        return
      }
      this.sentToken = token
      this.authError = null
      socket.emit('authenticate', { token })
    })
    socket.on('authenticated', () => {
      this.authenticated = true
      this.failures = 0
      this.invalidInARow = 0
      for (const chatRoomId of this.rooms.keys()) this.join(chatRoomId)
    })
    socket.on('auth_error', (payload: unknown) => {
      this.authError = field(payload, 'reason')
    })
    socket.on('disconnect', (reason: string) => {
      this.authenticated = false
      if (reason === 'io server disconnect') void this.reconnect(socket)
    })
    socket.on('message', () => {
      // 게이트웨이의 message 이벤트에는 방 ID가 없어 구독 중인 방 모두에 알린다
      for (const chatRoomId of this.rooms.keys()) this.notify(chatRoomId, 'message')
    })
    socket.on('read', (payload: unknown) => this.notifyRoomOf(payload, 'read'))
    socket.on('message_deleted', (payload: unknown) =>
      this.notifyRoomOf(payload, 'message_deleted'),
    )
    socket.connect()
  }

  private join(chatRoomId: number) {
    const socket = this.socket
    if (!socket || !this.authenticated) return
    socket.emit('subscribe', { chatRoomId }, (result: unknown) => {
      // 연결이 끊긴 사이 놓친 이벤트는 구독이 확인된 뒤 REST로 다시 읽는다
      if (field(result, 'ok') === true && this.socket === socket) this.notify(chatRoomId, 'joined')
    })
  }

  private async reconnect(socket: Socket) {
    const reason = this.authError
    this.authError = null

    if (reason === 'INVALID') {
      this.invalidInARow += 1
      if (this.invalidInARow > MAX_INVALID_IN_A_ROW) {
        this.close()
        return
      }
      // 대부분 30분짜리 Access Token 만료다. REST 요청이 이미 재발급했으면 그 토큰으로 다시 붙는다
      const token = this.deps.getAccessToken()
      const renewed =
        (token !== null && token !== this.sentToken) || (await this.deps.recoverSession())
      if (this.socket !== socket) return
      if (!renewed) {
        this.close()
        return
      }
      socket.connect()
      return
    }

    // 게이트웨이 재배포나 Spring 장애(UNAVAILABLE)는 간격을 늘려 가며 다시 시도한다
    const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** this.failures)
    this.failures += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (this.socket === socket) socket.connect()
    }, delay)
  }

  private notifyRoomOf(payload: unknown, event: ChatRoomEvent) {
    const chatRoomId = field(payload, 'chatRoomId')
    if (typeof chatRoomId === 'number') this.notify(chatRoomId, event)
  }

  private notify(chatRoomId: number, event: ChatRoomEvent) {
    for (const listener of this.rooms.get(chatRoomId) ?? []) listener(event)
  }

  private close() {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    const socket = this.socket
    this.socket = null
    this.retryTimer = null
    this.authenticated = false
    this.sentToken = null
    this.authError = null
    this.failures = 0
    this.invalidInARow = 0
    socket?.removeAllListeners()
    socket?.disconnect()
  }
}

export const chatSocket = new ChatSocketClient({
  // 여러 인스턴스 뒤에서 스티키 세션 없이 붙도록 롱폴링을 쓰지 않는다.
  // forceNew가 없으면 socket.io가 닫은 소켓을 캐시에서 다시 돌려준다.
  createSocket: () =>
    io({
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
      forceNew: true,
      reconnectionDelayMax: RETRY_MAX_MS,
    }),
  getAccessToken: () => authSession.getAccessToken(),
  recoverSession,
})
