export type ReviewRating = 1 | 2 | 3 | 4 | 5

export interface ReviewCreateRequest {
  tradeId: number
  rating: ReviewRating
  content?: string
}

export interface ReviewCreateResponse {
  reviewId: number
}
