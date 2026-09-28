import type { TradeSummaryResponse } from '@/features/trades/model/types'

/**
 * GET /users/{userId}/profile 응답(판매자 프로필 조회 명세).
 *
 * GET /users/me에는 평점·거래 수가 없어서 MY-001 프로필 카드가 내 userId로 이 공개 API를 한 번 더 부른다.
 */
export interface SellerProfileResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  completedTradeCount: number
  /** 후기가 없으면 null */
  averageRating: number | null
  reviewCount: number
  joinedAt: string
  reportFlag: boolean
}

/** 탈퇴하면 취소될 거래(REQUESTED · ACCEPTED). 요청 최신순이다. */
export interface OngoingTrades {
  items: TradeSummaryResponse[]
  /** 한 번에 받는 상한을 넘었으면 true — 화면은 "N건 이상"으로 표시한다 */
  hasMore: boolean
}
