import type { SellerProfileResponse } from '@/features/account/model/types'
import { listingFixtures } from '@/mocks/listingFixtures'

const wait = (milliseconds = 90) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

/**
 * 사용자 공개 정보 목 저장소. 판매자 신뢰 정보는 게시글 픽스처의 판매자 값을 그대로 쓴다.
 * 게시글이 없는 회원(온보딩으로 새로 만든 계정)은 거래 0회, 후기 없음이다.
 */
export const mockUserRepository = {
  async getSellerProfile(userId: number): Promise<SellerProfileResponse> {
    await wait()
    const seller = listingFixtures.find((listing) => listing.seller.userId === userId)?.seller
    return {
      userId,
      nickname: seller?.nickname ?? '회원',
      profileImageUrl: seller?.profileImageUrl ?? null,
      bio: null,
      completedTradeCount: seller?.completedTradeCount ?? 0,
      averageRating: seller?.averageRating ?? null,
      reviewCount: 0,
      joinedAt: '2026-01-10T03:00:00Z',
      reportFlag: false,
    }
  },
}
