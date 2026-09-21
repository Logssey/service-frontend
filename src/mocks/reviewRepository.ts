import type { UserSummaryResponse } from '@/features/listings/model/types'
import type {
  ReviewCreateRequest,
  ReviewCreateResponse,
  ReviewPage,
  ReviewResponse,
} from '@/features/reviews/model/types'
import { mockTradeRepository } from '@/mocks/tradeRepository'

const CURRENT_USER: UserSummaryResponse = {
  userId: 3,
  nickname: '재현',
  profileImageUrl: null,
}

interface MockReviewRecord extends ReviewResponse {
  revieweeId: number
}

const initialReviews: MockReviewRecord[] = [
  {
    reviewId: 8,
    revieweeId: 3,
    reviewer: {
      userId: 31,
      nickname: '조명찾는사람',
      profileImageUrl: null,
    },
    rating: 5,
    content: '약속 시간을 잘 지켜 주시고 상품 설명도 정확했어요.',
    createdAt: '2026-09-18T11:10:00Z',
  },
  {
    reviewId: 9,
    revieweeId: 3,
    reviewer: {
      userId: 27,
      nickname: '다시쓰는마음',
      profileImageUrl: null,
    },
    rating: 4,
    content: null,
    createdAt: '2026-09-12T02:30:00Z',
  },
]

let reviews = structuredClone(initialReviews)
let nextReviewId = 10

const wait = (milliseconds = 130) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function cursorToOffset(cursor?: string | null) {
  if (!cursor) return 0
  const offset = Number.parseInt(atob(cursor), 10)
  return Number.isNaN(offset) ? 0 : offset
}

function toReviewResponse(review: MockReviewRecord): ReviewResponse {
  return {
    reviewId: review.reviewId,
    reviewer: structuredClone(review.reviewer),
    rating: review.rating,
    content: review.content,
    createdAt: review.createdAt,
  }
}

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

    const trade = mockTradeRepository.markReviewWritten(request.tradeId)
    const reviewId = nextReviewId++
    const reviewee = trade.myRole === 'BUYER' ? trade.seller : trade.buyer
    reviews.unshift({
      reviewId,
      revieweeId: reviewee.userId,
      reviewer: CURRENT_USER,
      rating: request.rating,
      content: request.content?.trim() || null,
      createdAt: new Date().toISOString(),
    })
    return { reviewId }
  },

  async getReceivedReviews(
    cursor?: string | null,
    size = 20,
  ): Promise<ReviewPage> {
    await wait()
    const offset = cursorToOffset(cursor)
    const received = reviews
      .filter((review) => review.revieweeId === CURRENT_USER.userId)
      .sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )
    const pageItems = received.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length

    return {
      items: pageItems.map(toReviewResponse),
      nextCursor: nextOffset < received.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < received.length,
    }
  },

  reset() {
    reviews = structuredClone(initialReviews)
    nextReviewId = 10
  },
}
