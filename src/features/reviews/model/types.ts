import type { UserSummaryResponse } from '@/features/listings/model/types'
import type { CursorPageResponse } from '@/shared/model/api'

export type ReviewRating = 1 | 2 | 3 | 4 | 5

export interface ReviewCreateRequest {
  tradeId: number
  rating: ReviewRating
  content?: string
}

export interface ReviewCreateResponse {
  reviewId: number
}

export interface ReviewResponse {
  reviewId: number
  reviewer: UserSummaryResponse
  rating: ReviewRating
  content: string | null
  createdAt: string
}

export type ReviewPage = CursorPageResponse<ReviewResponse>
