import type {
  MyListingPage,
  MyListingSearchRequest,
} from '@/features/me/model/types'
import type { ReviewPage } from '@/features/reviews/model/types'
import { mockListingRepository } from '@/mocks/listingRepository'
import { mockReviewRepository } from '@/mocks/reviewRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

function toMyListingSearchParams(request: MyListingSearchRequest) {
  const params = new URLSearchParams({ size: String(request.size ?? 20) })
  if (request.status) params.set('status', request.status)
  if (request.cursor) params.set('cursor', request.cursor)
  return params
}

function toCursorSearchParams(cursor?: string | null, size = 20) {
  const params = new URLSearchParams({ size: String(size) })
  if (cursor) params.set('cursor', cursor)
  return params
}

export const meApi = {
  async getMySellingListings(
    request: MyListingSearchRequest,
  ): Promise<MyListingPage> {
    if (useMocks) return mockListingRepository.getMySellingListings(request)
    return apiRequest<MyListingPage>(
      `/me/selling/listings?${toMyListingSearchParams(request)}`,
    )
  },

  async getReceivedReviews(
    cursor?: string | null,
    size = 20,
  ): Promise<ReviewPage> {
    if (useMocks) return mockReviewRepository.getReceivedReviews(cursor, size)
    return apiRequest<ReviewPage>(
      `/me/reviews?${toCursorSearchParams(cursor, size)}`,
    )
  },
}
