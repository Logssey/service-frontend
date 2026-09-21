import type {
  ListingStatus,
  UserSummaryResponse,
} from '@/features/listings/model/types'
import type { CursorPageResponse } from '@/shared/model/api'

// TODO(api): DELETED는 isDeleted를 조회하기 위한 화면설계서의 pseudo status다.
// 백엔드 AdminListingSearchRequest enum 확정 시 실제 직렬화 값을 재확인한다.
export type AdminListingStatusFilter = ListingStatus | 'DELETED'

export interface AdminListingSearchRequest {
  status: AdminListingStatusFilter | null
  keyword: string
  sellerId: number | null
  cursor?: string | null
  size?: number
}

export interface AdminListingResponse {
  listingId: number
  title: string
  price: number
  status: ListingStatus
  seller: UserSummaryResponse
  reportCount: number
  isDeleted: boolean
  createdAt: string
}

export type AdminListingStatusAction = 'HIDDEN' | 'RESTORE'

export interface AdminListingStatusRequest {
  status: AdminListingStatusAction
  reason: string
}

export interface AdminListingStatusResponse {
  listingId: number
  status: ListingStatus
}

export interface AdminDeleteRequest {
  reason: string
}

export type AdminListingPage = CursorPageResponse<AdminListingResponse>
