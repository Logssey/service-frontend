import type { UserSummaryResponse } from '@/features/listings/model/types'
import type { CursorPageResponse } from '@/shared/model/api'

export type TradeStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELED'

export type TradeRole = 'BUYER' | 'SELLER'
export type TradeRoleFilter = 'buyer' | 'seller'
export type TradeAction = 'accept' | 'reject' | 'cancel' | 'complete'

export interface ListingBriefResponse {
  listingId: number
  title: string
  price: number
  thumbnailUrl: string
}

export interface TradeSummaryResponse {
  tradeId: number
  status: TradeStatus
  listing: ListingBriefResponse
  counterparty: UserSummaryResponse
  myRole: TradeRole
  requestedAt: string
  completedAt: string | null
  reviewWritten: boolean
}

export interface TradeHistoryResponse {
  status: TradeStatus
  changedAt: string
  reason: string | null
}

export interface TradeDetailResponse {
  tradeId: number
  status: TradeStatus
  listing: ListingBriefResponse
  seller: UserSummaryResponse
  buyer: UserSummaryResponse
  myRole: TradeRole
  chatRoomId: number | null
  reviewWritten: boolean
  histories: TradeHistoryResponse[]
}

export interface TradeCreateRequest {
  listingId: number
}

export interface TradeCreateResponse {
  tradeId: number
  status: 'REQUESTED'
}

export interface TradeStatusResponse {
  tradeId: number
  status: TradeStatus
  changedAt: string
}

export interface TradeCloseRequest {
  reason?: string
}

export interface TradeSearchRequest {
  role: TradeRoleFilter
  status?: TradeStatus | null
  cursor?: string | null
  size?: number
}

export type TradePage = CursorPageResponse<TradeSummaryResponse>
