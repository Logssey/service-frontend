import type { OngoingTrades, SellerProfileResponse } from '@/features/account/model/types'
import type { TradePage, TradeStatus } from '@/features/trades/model/types'
import { mockTradeRepository } from '@/mocks/tradeRepository'
import { mockUserRepository } from '@/mocks/userRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

/** 거래 목록 조회의 size 상한(100). 진행 중인 거래가 이보다 많은 경우는 드물어 첫 페이지만 본다. */
const ONGOING_PAGE_SIZE = 100
const ONGOING_STATUSES: TradeStatus[] = ['REQUESTED', 'ACCEPTED']

/**
 * 마이페이지 계정 화면(MY-001 · MY-003)이 쓰는 조회
 * (02-functional-design/screen-design/my-account.md "API 명세").
 * 본인 정보와 탈퇴 요청은 authApi에 있다.
 */
export const accountApi = {
  /** MY-001 · GET /users/{userId}/profile — 프로필 카드의 평점·거래 수 */
  async getSellerProfile(userId: number): Promise<SellerProfileResponse> {
    if (useMocks) return mockUserRepository.getSellerProfile(userId)
    return apiRequest<SellerProfileResponse>(`/users/${userId}/profile`)
  },

  /**
   * MY-003 · 탈퇴하면 취소될 거래를 미리 보여 준다.
   *
   * GET /trades는 status를 하나만 받으므로 두 번 부르고 합친다. role을 빼면 판매·구매 거래가 모두 온다.
   * 미리 보기일 뿐이고 실제 취소 대상은 서버가 탈퇴 시점에 다시 찾는다.
   */
  async getOngoingTrades(): Promise<OngoingTrades> {
    const pages = await Promise.all(ONGOING_STATUSES.map(fetchTradesByStatus))
    const items = pages
      .flatMap((page) => page.items)
      .sort((left, right) => Date.parse(right.requestedAt) - Date.parse(left.requestedAt))
    return { items, hasMore: pages.some((page) => page.hasNext) }
  },
}

async function fetchTradesByStatus(status: TradeStatus): Promise<TradePage> {
  if (!useMocks) {
    return apiRequest<TradePage>(`/trades?status=${status}&size=${ONGOING_PAGE_SIZE}`)
  }
  // 목 거래 저장소는 role이 필수라 판매·구매를 따로 받아 합친다
  const [buying, selling] = await Promise.all(
    (['buyer', 'seller'] as const).map((role) =>
      mockTradeRepository.getTrades({ role, status, size: ONGOING_PAGE_SIZE }),
    ),
  )
  return {
    items: [...buying.items, ...selling.items],
    nextCursor: null,
    hasNext: buying.hasNext || selling.hasNext,
  }
}
