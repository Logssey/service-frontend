import type {
  ReviewCreateRequest,
  ReviewCreateResponse,
} from '@/features/reviews/model/types'
import { mockTradeRepository } from '@/mocks/tradeRepository'

let nextReviewId = 10

const wait = (milliseconds = 130) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export const mockReviewRepository = {
  async createReview(
    request: ReviewCreateRequest,
  ): Promise<ReviewCreateResponse> {
    await wait()
    if (!Number.isInteger(request.rating) || request.rating < 1 || request.rating > 5) {
      throw new Error('별점은 1점부터 5점까지 선택해 주세요.')
    }
    if (request.content && request.content.length > 500) {
      throw new Error('후기 내용은 500자 이하로 입력해 주세요.')
    }

    mockTradeRepository.markReviewWritten(request.tradeId)
    return { reviewId: nextReviewId++ }
  },

  reset() {
    nextReviewId = 10
  },
}
