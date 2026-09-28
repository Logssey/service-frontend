import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/model/authStore'
import { chatKeys } from '@/features/chat/model/queries'

/**
 * Gateway contract: connect without credentials, then authenticate({token}) and
 * subscribe({chatRoomId}). The token is never put in the URL or Socket.IO handshake.
 * Deployments route same-origin /socket.io to chat-server; the Vite proxy does so locally.
 */
export function useChatRealtime(chatRoomIds: number[]) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const setAccessToken = useAuthStore((state) => state.setAccessToken)
  const clearSession = useAuthStore((state) => state.clear)
  const roomIdsKey = [...new Set(chatRoomIds.filter((id) => Number.isSafeInteger(id) && id > 0))]
    .slice(0, 50)
    .join(',')

  useEffect(() => {
    if (import.meta.env.VITE_USE_MOCKS !== 'false' || !accessToken || !roomIdsKey) return
    const roomIds = roomIdsKey.split(',').map(Number)
    const socket = io(import.meta.env.VITE_CHAT_SOCKET_URL || window.location.origin, {
      path: '/socket.io',
      autoConnect: false,
      withCredentials: false,
    })
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined

    socket.on('connect', () => socket.emit('authenticate', { token: accessToken }))
    socket.on('authenticated', () => {
      roomIds.forEach((chatRoomId) => socket.emit('subscribe', { chatRoomId },
        (ack: { ok?: boolean }) => {
          // The gateway joins only after an asynchronous authorization check.
          // Fetch again after its acknowledgement to close the REST/join gap.
          if (ack?.ok && !cancelled) void queryClient.invalidateQueries({ queryKey: chatKeys.all })
        }))
    })
    const refreshChat = () => { void queryClient.invalidateQueries({ queryKey: chatKeys.all }) }
    socket.on('message', refreshChat)
    socket.on('read', refreshChat)
    socket.on('message_deleted', refreshChat)
    socket.on('forbidden', refreshChat)
    socket.on('auth_error', (event: { reason?: string }) => {
      if (event?.reason !== 'INVALID') return
      void authApi.refresh().then((result) => {
        if (!cancelled) setAccessToken(result.accessToken)
      }).catch(() => {
        if (!cancelled) clearSession()
      })
    })
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' && !cancelled) {
        reconnectTimer = setTimeout(() => socket.connect(), 3_000)
      }
    })
    socket.connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      roomIds.forEach((chatRoomId) => socket.emit('unsubscribe', { chatRoomId }))
      socket.disconnect()
    }
  }, [accessToken, roomIdsKey, queryClient, setAccessToken, clearSession])
}
