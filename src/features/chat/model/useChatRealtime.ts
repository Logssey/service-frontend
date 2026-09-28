import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/model/authStore'
import { chatSocket } from '@/features/chat/api/chatSocket'
import { chatKeys } from '@/features/chat/model/queries'

/**
 * Keep the visible room list current through the same socket used by a room page.
 * The gateway event is only a hint; the REST list remains the source of truth.
 */
export function useChatRealtime(chatRoomIds: number[]) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const roomIdsKey = [...new Set(chatRoomIds.filter((id) => Number.isSafeInteger(id) && id > 0))]
    .slice(0, 50)
    .join(',')

  useEffect(() => {
    if (import.meta.env.VITE_USE_MOCKS !== 'false' ||
      import.meta.env.VITE_CHAT_REALTIME !== 'true' || !accessToken || !roomIdsKey) return
    const roomIds = roomIdsKey.split(',').map(Number)
    const unsubscribe = roomIds.map((chatRoomId) => chatSocket.subscribe(chatRoomId, () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() })
    }))
    return () => {
      unsubscribe.forEach((stop) => stop())
    }
  }, [accessToken, roomIdsKey, queryClient])
}
