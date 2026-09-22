import type { UserSummaryResponse } from '@/features/listings/model/types'
import type {
  ListingBriefResponse,
  TradeStatus,
} from '@/features/trades/model/types'
import type { CursorPageResponse } from '@/shared/model/api'

export type AdminTradeStatusFilter = Exclude<TradeStatus, 'REJECTED'>

export interface AdminTradeSearchRequest {
  status: AdminTradeStatusFilter | null
  userId: number | null
  cursor?: string | null
  size?: number
}

export interface AdminTradeResponse {
  tradeId: number
  listing: ListingBriefResponse
  seller: UserSummaryResponse
  buyer: UserSummaryResponse
  status: TradeStatus
  requestedAt: string
  completedAt: string | null
}

export type AdminTradePage = CursorPageResponse<AdminTradeResponse>
