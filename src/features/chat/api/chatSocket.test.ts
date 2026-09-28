import type { Socket } from 'socket.io-client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatSocketClient, type ChatRoomEvent } from '@/features/chat/api/chatSocket'

type Handler = (...args: unknown[]) => void

/** 게이트웨이와 주고받는 이벤트만 기록하는 소켓 대역 */
class FakeSocket {
  readonly handlers = new Map<string, Handler[]>()
  readonly sent: unknown[][] = []
  connects = 0
  disconnected = false

  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler])
    return this
  }

  emit(...packet: unknown[]) {
    this.sent.push(packet)
    return this
  }

  connect() {
    this.connects += 1
    return this
  }

  disconnect() {
    this.disconnected = true
    return this
  }

  removeAllListeners() {
    this.handlers.clear()
    return this
  }

  receive(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args)
  }

  sentEvents(name: string) {
    return this.sent.filter(([event]) => event === name)
  }

  acknowledgeSubscribe(chatRoomId: number) {
    const packet = [...this.sentEvents('subscribe')]
      .reverse()
      .find(([, payload]) => (payload as { chatRoomId: number }).chatRoomId === chatRoomId)
    ;(packet?.[2] as (result: unknown) => void)({ ok: true, chatRoomId })
  }

  authenticate() {
    this.receive('connect')
    this.receive('authenticated')
  }

  rejectAuthentication(reason: string) {
    this.receive('auth_error', { reason })
    this.receive('disconnect', 'io server disconnect')
  }
}

function setup(recover?: () => Promise<boolean>) {
  const session = { token: 'token-1' as string | null }
  const sockets: FakeSocket[] = []
  const recoverSession = vi.fn(
    recover ??
      (async () => {
        session.token = 'token-2'
        return true
      }),
  )
  const client = new ChatSocketClient({
    createSocket: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket as unknown as Socket
    },
    getAccessToken: () => session.token,
    recoverSession,
  })
  return { client, session, sockets, recoverSession }
}

describe('채팅 게이트웨이 연결', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('연결 뒤 authenticate 이벤트로 토큰을 보내고, 인증되면 방을 구독한다', () => {
    const { client, sockets } = setup()
    const events: ChatRoomEvent[] = []

    client.subscribe(12, (event) => events.push(event))
    const socket = sockets[0]
    expect(socket.connects).toBe(1)

    socket.receive('connect')
    expect(socket.sent).toEqual([['authenticate', { token: 'token-1' }]])

    socket.receive('authenticated')
    expect(socket.sentEvents('subscribe').map(([, payload]) => payload)).toEqual([
      { chatRoomId: 12 },
    ])

    socket.acknowledgeSubscribe(12)
    expect(events).toEqual(['joined'])
  })

  it('읽음·삭제는 그 방에만, 방 ID가 없는 새 메시지는 구독 중인 방 모두에 알린다', () => {
    const { client, sockets } = setup()
    const room12: ChatRoomEvent[] = []
    const room34: ChatRoomEvent[] = []
    client.subscribe(12, (event) => room12.push(event))
    client.subscribe(34, (event) => room34.push(event))
    const socket = sockets[0]
    socket.authenticate()

    socket.receive('read', { chatRoomId: 12, lastReadMessageId: 5 })
    socket.receive('message_deleted', { chatRoomId: 34, messageId: 7 })
    socket.receive('message', { messageId: 8, senderId: 2, content: '안녕하세요' })

    expect(room12).toEqual(['read', 'message'])
    expect(room34).toEqual(['message_deleted', 'message'])
  })

  it('Access Token이 만료돼 거절되면 재발급한 토큰으로 다시 붙고 방을 다시 구독한다', async () => {
    const { client, sockets, recoverSession } = setup()
    client.subscribe(12, () => {})
    const socket = sockets[0]
    socket.authenticate()

    socket.rejectAuthentication('INVALID')
    await vi.waitFor(() => expect(socket.connects).toBe(2))
    expect(recoverSession).toHaveBeenCalledTimes(1)

    socket.authenticate()
    expect(socket.sentEvents('authenticate').at(-1)).toEqual([
      'authenticate',
      { token: 'token-2' },
    ])
    expect(socket.sentEvents('subscribe')).toHaveLength(2)
  })

  it('REST 요청이 이미 토큰을 재발급했으면 재발급 없이 그 토큰으로 다시 붙는다', async () => {
    const { client, session, sockets, recoverSession } = setup()
    client.subscribe(12, () => {})
    const socket = sockets[0]
    socket.authenticate()

    session.token = 'token-2'
    socket.rejectAuthentication('INVALID')

    await vi.waitFor(() => expect(socket.connects).toBe(2))
    expect(recoverSession).not.toHaveBeenCalled()
  })

  it('재발급한 토큰도 계속 거절되면 더 붙지 않는다', async () => {
    const { client, sockets, recoverSession } = setup()
    client.subscribe(12, () => {})
    const socket = sockets[0]

    for (const attempt of [1, 2]) {
      socket.receive('connect')
      socket.rejectAuthentication('INVALID')
      await vi.waitFor(() => expect(socket.connects).toBe(attempt + 1))
    }
    socket.receive('connect')
    socket.rejectAuthentication('INVALID')

    expect(socket.disconnected).toBe(true)
    expect(socket.connects).toBe(3)
    expect(recoverSession).toHaveBeenCalledTimes(2)
  })

  it('세션을 되살리지 못하면 연결을 닫는다', async () => {
    const { client, sockets } = setup(async () => false)
    client.subscribe(12, () => {})
    const socket = sockets[0]
    socket.authenticate()

    socket.rejectAuthentication('INVALID')

    await vi.waitFor(() => expect(socket.disconnected).toBe(true))
    expect(socket.connects).toBe(1)
  })

  it('게이트웨이가 연결을 끊으면(재배포) 간격을 늘려 가며 다시 붙는다', () => {
    vi.useFakeTimers()
    const { client, sockets } = setup()
    client.subscribe(12, () => {})
    const socket = sockets[0]
    socket.authenticate()

    socket.receive('disconnect', 'io server disconnect')
    vi.advanceTimersByTime(999)
    expect(socket.connects).toBe(1)
    vi.advanceTimersByTime(1)
    expect(socket.connects).toBe(2)

    socket.receive('disconnect', 'io server disconnect')
    vi.advanceTimersByTime(1_999)
    expect(socket.connects).toBe(2)
    vi.advanceTimersByTime(1)
    expect(socket.connects).toBe(3)
  })

  it('방의 마지막 구독을 해제하면 unsubscribe를 보내고 연결을 닫는다', () => {
    const { client, sockets } = setup()
    const first = client.subscribe(12, () => {})
    const second = client.subscribe(12, () => {})
    const socket = sockets[0]
    socket.authenticate()

    first()
    expect(socket.sentEvents('unsubscribe')).toHaveLength(0)
    expect(socket.disconnected).toBe(false)

    second()
    expect(socket.sentEvents('unsubscribe')).toEqual([['unsubscribe', { chatRoomId: 12 }]])
    expect(socket.disconnected).toBe(true)
  })

  it('세션을 끝내면 연결을 닫고, 남은 해제 함수를 불러도 다시 보내지 않는다', () => {
    const { client, sockets } = setup()
    const unsubscribe = client.subscribe(12, () => {})
    const socket = sockets[0]
    socket.authenticate()

    client.disconnect()
    expect(socket.disconnected).toBe(true)

    unsubscribe()
    expect(socket.sentEvents('unsubscribe')).toHaveLength(0)
    expect(sockets).toHaveLength(1)
  })

  it('로그인 전에는 연결하지 않는다', () => {
    const { client, session, sockets } = setup()
    session.token = null

    client.subscribe(12, () => {})

    expect(sockets).toHaveLength(0)
  })
})
