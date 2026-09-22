import type { UserSummaryResponse } from '@/features/listings/model/types'
import type { ListingBriefResponse } from '@/features/trades/model/types'
import type { CursorPageResponse } from '@/shared/model/api'

export interface ChatRoomSummaryResponse {
  chatRoomId: number
  listing: ListingBriefResponse
  counterparty: UserSummaryResponse
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  tradeId: number | null
}

export interface ChatRoomCreateRequest {
  listingId: number
}

export interface ChatRoomCreateResponse {
  chatRoomId: number
  created: boolean
}

export interface MessageResponse {
  messageId: number
  senderId: number
  content: string | null
  isMine: boolean
  isDeleted: boolean
  readAt: string | null
  createdAt: string
}

export interface MessageSendRequest {
  content: string
}

export interface MessageReadRequest {
  lastReadMessageId: number
}

export interface MessageReadResponse {
  chatRoomId: number
  unreadCount: number
}

export type ChatRoomPage = CursorPageResponse<ChatRoomSummaryResponse>
export type MessagePage = CursorPageResponse<MessageResponse>
