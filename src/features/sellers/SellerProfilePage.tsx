import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { blocksApi } from '@/features/blocks/api/blocksApi'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ListingCard } from '@/features/listings/components/ListingCard'
import type { ListingSummaryResponse } from '@/features/listings/model/types'
import type { ReviewResponse } from '@/features/reviews/model/types'
import { apiRequest } from '@/shared/api/http'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import type { CursorPageResponse } from '@/shared/model/api'
import { useToastStore } from '@/shared/state/toastStore'

interface SellerProfile {
  userId: number
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  completedTradeCount: number
  averageRating: number | null
  reviewCount: number
  joinedAt: string
  reportFlag: boolean
}

function pageParams(cursor: string | null) {
  const params = new URLSearchParams({ size: '12' })
  if (cursor) params.set('cursor', cursor)
  return params
}

export function SellerProfilePage() {
  const userId = Number(useParams().userId)
  const validId = Number.isSafeInteger(userId) && userId > 0
  const ownUserId = useAuthStore((state) => state.user?.userId)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const block = useMutation({ mutationFn: blocksApi.create,
    onSuccess: async () => {
      showToast('사용자를 차단했습니다.')
      await queryClient.invalidateQueries({ queryKey: ['blocks'] })
    },
    onError: () => showToast('사용자를 차단하지 못했습니다.'),
  })
  const profile = useQuery({
    queryKey: ['seller', userId],
    queryFn: () => apiRequest<SellerProfile>(`/users/${userId}/profile`),
    enabled: validId,
  })
  const listings = useInfiniteQuery({
    queryKey: ['seller', userId, 'listings'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => apiRequest<CursorPageResponse<ListingSummaryResponse>>(
      `/users/${userId}/listings?${pageParams(pageParam)}`,
    ),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
    enabled: validId,
  })
  const reviews = useInfiniteQuery({
    queryKey: ['seller', userId, 'reviews'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => apiRequest<CursorPageResponse<ReviewResponse>>(
      `/users/${userId}/reviews?${pageParams(pageParam)}`,
    ),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
    enabled: validId,
  })
  const items = listings.data?.pages.flatMap((page) => page.items) ?? []
  const reviewItems = reviews.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="app-page collection-page">
      <PageHeader title="판매자 프로필" action={validId && userId !== ownUserId ? (
        <span className="account-header-actions">
          <button className="text-action" type="button" disabled={block.isPending}
            onClick={() => { if (window.confirm('이 사용자를 차단할까요?')) block.mutate(userId) }}>차단</button>
          <Link className="text-action" to={`/reports/new?targetType=USER&targetId=${userId}`}>신고</Link>
        </span>
      ) : null} />
      <main className="content-shell collection-content">
        {!validId || profile.isError ? <ErrorState title="판매자를 찾을 수 없어요"
          retry={() => void profile.refetch()} /> : null}
        {profile.isLoading ? <LoadingState label="판매자 정보를 불러오는 중" /> : null}
        {profile.data ? <section className="seller-profile">
          <div className="seller-profile__intro">
            {profile.data.profileImageUrl ? <img src={profile.data.profileImageUrl}
              alt="판매자 프로필" /> : <span aria-hidden="true">{profile.data.nickname.slice(0, 1)}</span>}
            <div>
              <h1>{profile.data.nickname}</h1>
              <p>{profile.data.bio || '소개가 아직 없습니다.'}</p>
              <p>완료 거래 {profile.data.completedTradeCount}회 · 후기 {profile.data.reviewCount}개
                {profile.data.averageRating !== null ? ` · 평점 ${profile.data.averageRating.toFixed(1)}` : ''}</p>
              <p>가입 {new Date(profile.data.joinedAt).toLocaleDateString('ko-KR')}</p>
              {profile.data.reportFlag ? <p className="seller-profile__warning" role="status">신고 누적 주의</p> : null}
            </div>
          </div>
        </section> : null}
        <section aria-labelledby="seller-listings-heading">
          <h2 id="seller-listings-heading">판매 상품</h2>
          {listings.isLoading ? <LoadingState label="상품을 불러오는 중" /> : null}
          {listings.isError ? <ErrorState title="상품을 불러오지 못했어요"
            retry={() => void listings.refetch()} /> : null}
          {listings.isSuccess && items.length === 0 ? <EmptyState title="공개된 상품이 없습니다"
            description="등록한 상품이 이곳에 표시됩니다." /> : null}
          <div className="listing-grid">{items.map((item) => <ListingCard key={item.listingId} listing={item} />)}</div>
          {listings.hasNextPage ? <button className="load-more" type="button"
            disabled={listings.isFetchingNextPage} onClick={() => void listings.fetchNextPage()}>
            상품 더 보기
          </button> : null}
        </section>
        <section aria-labelledby="seller-reviews-heading">
          <h2 id="seller-reviews-heading">받은 후기</h2>
          {reviews.isLoading ? <LoadingState label="후기를 불러오는 중" /> : null}
          {reviews.isError ? <ErrorState title="후기를 불러오지 못했어요"
            retry={() => void reviews.refetch()} /> : null}
          {reviews.isSuccess && reviewItems.length === 0 ? <EmptyState title="후기가 없습니다"
            description="거래를 완료하면 후기가 이곳에 표시됩니다." /> : null}
          <div className="seller-reviews">{reviewItems.map((review) => (
            <article className="review-card" key={review.reviewId}>
              <strong>{review.reviewer.nickname} · {'★'.repeat(review.rating)}</strong>
              {review.content ? <p>{review.content}</p> : null}
              <small>{new Date(review.createdAt).toLocaleDateString('ko-KR')}</small>
            </article>
          ))}</div>
          {reviews.hasNextPage ? <button className="load-more" type="button"
            disabled={reviews.isFetchingNextPage} onClick={() => void reviews.fetchNextPage()}>
            후기 더 보기
          </button> : null}
        </section>
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
