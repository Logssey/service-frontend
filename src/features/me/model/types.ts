import type { ListingStatus } from '@/features/listings/model/types'
import type { CursorPageResponse } from '@/shared/model/api'

export type MyListingStatusFilter = Exclude<ListingStatus, 'HIDDEN'>

export interface MyListingSearchRequest {
  status: MyListingStatusFilter | null
  cursor?: string | null
  size?: number
}

export interface MyListingResponse {
  listingId: number
  title: string
  price: number
  status: ListingStatus
  thumbnailUrl: string
  wishCount: number
  viewCount: number
  pendingTradeCount: number
  createdAt: string
}

export type MyListingPage = CursorPageResponse<MyListingResponse>
