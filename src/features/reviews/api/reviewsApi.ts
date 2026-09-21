import type {
  ReviewCreateRequest,
  ReviewCreateResponse,
} from '@/features/reviews/model/types'
import { mockReviewRepository } from '@/mocks/reviewRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

export const reviewsApi = {
  async createReview(
    request: ReviewCreateRequest,
  ): Promise<ReviewCreateResponse> {
    if (useMocks) return mockReviewRepository.createReview(request)
    return apiRequest<ReviewCreateResponse>('/reviews', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },
}
