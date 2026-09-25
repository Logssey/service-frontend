import type { CursorPageResponse } from '@/shared/model/api'

export type ListingStatus = 'ON_SALE' | 'RESERVED' | 'COMPLETED' | 'HIDDEN'
export type ItemCondition = 'NEW' | 'LIKE_NEW' | 'USED' | 'DAMAGED'
export type TradeMethod = 'DIRECT' | 'DELIVERY' | 'BOTH'
export type ListingSort = 'latest' | 'priceAsc' | 'priceDesc'

export interface CategoryResponse {
  categoryId: number
  name: string
}

export interface UserSummaryResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
}

export interface SellerBriefResponse extends UserSummaryResponse {
  completedTradeCount: number
  averageRating: number | null
}

export interface ListingImageResponse {
  imageId: number
  url: string
  displayOrder: number
}

export interface ListingSummaryResponse {
  listingId: number
  title: string
  price: number
  status: ListingStatus
  itemCondition: ItemCondition
  thumbnailUrl: string | null
  wishCount: number
  seller: UserSummaryResponse
  createdAt: string
}

export interface ListingDetailResponse {
  listingId: number
  title: string
  description: string
  price: number
  itemCondition: ItemCondition
  tradeMethod: TradeMethod
  status: ListingStatus
  category: CategoryResponse
  images: ListingImageResponse[]
  wishCount: number
  viewCount: number
  isWished: boolean
  isMine: boolean
  seller: SellerBriefResponse
  createdAt: string
}

export interface ListingFilters {
  keyword: string
  categoryId: number | null
  status: ListingStatus | null
  minPrice: number | null
  maxPrice: number | null
  itemCondition: ItemCondition | null
  sort: ListingSort
}

export interface ListingSearchRequest extends ListingFilters {
  cursor?: string | null
  size?: number
}

export interface ListingCreateRequest {
  title: string
  description: string
  price: number
  itemCondition: ItemCondition
  tradeMethod: TradeMethod
  categoryId: number
  imageIds: number[]
}

export type ListingUpdateRequest = Partial<ListingCreateRequest>

export interface ListingCreateResponse {
  listingId: number
}

export interface ImageUploadUrlRequest {
  purpose: 'LISTING' | 'PROFILE'
  fileName: string
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  fileSize: number
}

export interface ImageUploadUrlResponse {
  imageId: number
  uploadUrl: string
  expiresAt: string
}

export interface ImageUploadResultResponse {
  imageId: number
  status: 'VERIFIED' | 'REJECTED'
  url: string
  thumbnailUrl: string
}

export type ListingPage = CursorPageResponse<ListingSummaryResponse>
