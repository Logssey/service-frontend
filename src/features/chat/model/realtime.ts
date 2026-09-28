import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth/model/authStore'
import { chatSocket } from '@/features/chat/api/chatSocket'
import { chatKeys } from '@/features/chat/model/queries'

// 목 저장소에는 게이트웨이가 없고, 채팅 서버가 배포되지 않은 환경에서는 켜지 않는다
const realtimeEnabled =
  import.meta.env.VITE_USE_MOCKS === 'false' && import.meta.env.VITE_CHAT_REALTIME === 'true'

/**
 * 채팅방을 실시간 게이트웨이에 구독한다.
 *
 * 소켓 이벤트는 "이 방이 바뀌었다"는 신호로만 쓰고 내용은 REST로 다시 읽는다.
 * Pub/Sub은 유실될 수 있어 재연결 뒤에는 어차피 목록을 다시 받아야 하고,
 * 그렇게 하면 캐시에 넣은 메시지와 서버 목록이 어긋날 일이 없다.
 */
export function useChatRoomRealtime(chatRoomId: number) {
  const queryClient = useQueryClient()
  const signedIn = useAuthStore((state) => state.accessToken !== null)

  useEffect(() => {
    if (!realtimeEnabled || !signedIn || !Number.isFinite(chatRoomId)) return
    return chatSocket.subscribe(chatRoomId, (event) => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatRoomId) })
      // 읽음은 내 메시지의 표시만 바꾸고 목록의 마지막 메시지·미읽음 수에는 영향이 없다
      if (event !== 'read') {
        void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() })
      }
    })
  }, [chatRoomId, queryClient, signedIn])
}
