import type {
  ChatRoomCreateRequest,
  ChatRoomCreateResponse,
  ChatRoomPage,
  ChatRoomSummaryResponse,
  MessagePage,
  MessageReadRequest,
  MessageReadResponse,
  MessageResponse,
  MessageSendRequest,
} from '@/features/chat/model/types'
import { mockChatRepository } from '@/mocks/chatRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

function pageParams(cursor?: string | null, size = 20) {
  const params = new URLSearchParams({ size: String(size) })
  if (cursor) params.set('cursor', cursor)
  return params
}

export const chatApi = {
  async getChatRooms(cursor?: string | null, size = 20): Promise<ChatRoomPage> {
    if (useMocks) return mockChatRepository.getChatRooms(cursor, size)
    return apiRequest<ChatRoomPage>(`/chat-rooms?${pageParams(cursor, size)}`)
  },

  async getChatRoomSummary(chatRoomId: number): Promise<ChatRoomSummaryResponse> {
    if (useMocks) return mockChatRepository.getChatRoom(chatRoomId)

    // 현재 계약에는 채팅방 단건 조회가 없어 목록을 순회해 직접 진입을 복구한다.
    let cursor: string | null = null
    do {
      const page = await chatApi.getChatRooms(cursor, 100)
      const room = page.items.find((item) => item.chatRoomId === chatRoomId)
      if (room) return room
      cursor = page.nextCursor
      if (!page.hasNext) break
    } while (cursor)
    throw new Error('채팅방을 찾을 수 없습니다.')
  },

  async createChatRoom(
    request: ChatRoomCreateRequest,
  ): Promise<ChatRoomCreateResponse> {
    if (useMocks) return mockChatRepository.createChatRoom(request.listingId)
    return apiRequest<ChatRoomCreateResponse>('/chat-rooms', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async getMessages(
    chatRoomId: number,
    cursor?: string | null,
    size = 30,
  ): Promise<MessagePage> {
    if (useMocks) return mockChatRepository.getMessages(chatRoomId, cursor, size)
    return apiRequest<MessagePage>(
      `/chat-rooms/${chatRoomId}/messages?${pageParams(cursor, size)}`,
    )
  },

  async sendMessage(
    chatRoomId: number,
    request: MessageSendRequest,
  ): Promise<MessageResponse> {
    if (useMocks) return mockChatRepository.sendMessage(chatRoomId, request.content)
    return apiRequest<MessageResponse>(`/chat-rooms/${chatRoomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async deleteMessage(chatRoomId: number, messageId: number): Promise<void> {
    if (useMocks) return mockChatRepository.deleteMessage(chatRoomId, messageId)
    return apiRequest<void>(`/chat-rooms/${chatRoomId}/messages/${messageId}`, {
      method: 'DELETE',
    })
  },

  async readMessages(
    chatRoomId: number,
    request: MessageReadRequest,
  ): Promise<MessageReadResponse> {
    if (useMocks) {
      return mockChatRepository.readMessages(chatRoomId, request.lastReadMessageId)
    }
    return apiRequest<MessageReadResponse>(`/chat-rooms/${chatRoomId}/read`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },
}
