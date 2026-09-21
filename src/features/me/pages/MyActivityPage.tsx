import { ClipboardList, MessageCircle, PackageOpen, Star } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { MyListingCard } from '@/features/me/components/MyListingCard'
import { PendingRequestCard } from '@/features/me/components/PendingRequestCard'
import { ReceivedReviewCard } from '@/features/me/components/ReceivedReviewCard'
import {
  useMyReceivedReviews,
  useMySellingListings,
} from '@/features/me/model/queries'
import type { MyListingStatusFilter } from '@/features/me/model/types'
import { useTrades } from '@/features/trades/model/queries'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'

type ActivityTab = 'listings' | 'requests' | 'reviews'

const tabs: Array<{ value: ActivityTab; label: string; icon: typeof PackageOpen }> = [
  { value: 'listings', label: '내 게시글', icon: PackageOpen },
  { value: 'requests', label: '받은 요청', icon: MessageCircle },
  { value: 'reviews', label: '받은 후기', icon: Star },
]

const statusFilters: Array<{
  value: MyListingStatusFilter | null
  label: string
}> = [
  { value: null, label: '전체' },
  { value: 'ON_SALE', label: '판매중' },
  { value: 'RESERVED', label: '예약중' },
  { value: 'COMPLETED', label: '거래완료' },
]

function isActivityTab(value: string | null): value is ActivityTab {
  return value === 'listings' || value === 'requests' || value === 'reviews'
}

function isMyListingStatus(
  value: string | null,
): value is MyListingStatusFilter {
  return value === 'ON_SALE' || value === 'RESERVED' || value === 'COMPLETED'
}

export function MyActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const tab = isActivityTab(rawTab) ? rawTab : 'listings'
  const rawStatus = searchParams.get('status')
  const status = isMyListingStatus(rawStatus) ? rawStatus : null
  const listingsQuery = useMySellingListings(status, tab === 'listings')
  const requestsQuery = useTrades('seller', 'REQUESTED', tab === 'requests')
  const reviewsQuery = useMyReceivedReviews(tab === 'reviews')
  const listings = listingsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const requests = requestsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const reviews = reviewsQuery.data?.pages.flatMap((page) => page.items) ?? []

  const updateTab = (nextTab: ActivityTab) => {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'listings') next.delete('tab')
    else next.set('tab', nextTab)
    setSearchParams(next, { replace: true })
  }

  const updateStatus = (nextStatus: MyListingStatusFilter | null) => {
    const next = new URLSearchParams(searchParams)
    if (nextStatus) next.set('status', nextStatus)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="app-page collection-page my-activity-page">
      <PageHeader
        title="내 활동"
        action={
          <Link className="text-action" to="/trades">
            거래 내역
          </Link>
        }
      />
      <main className="content-shell my-activity-content">
        <section className="my-activity-heading">
          <span className="eyebrow">
            <ClipboardList size={16} aria-hidden="true" />
            MY ACTIVITY
          </span>
          <h1>거래 활동을 한곳에서</h1>
          <p>판매 중인 상품과 새 거래 요청, 구매자가 남긴 후기를 확인하세요.</p>
        </section>

        <div className="activity-tabs" role="tablist" aria-label="내 활동 유형">
          {tabs.map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              role="tab"
              id={`activity-tab-${value}`}
              aria-controls={`activity-panel-${value}`}
              aria-selected={tab === value}
              className={tab === value ? 'is-active' : ''}
              key={value}
              onClick={() => updateTab(value)}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'listings' ? (
          <section
            role="tabpanel"
            id="activity-panel-listings"
            aria-labelledby="activity-tab-listings"
            className="activity-panel"
          >
            <nav className="status-filter" aria-label="내 게시글 상태">
              {statusFilters.map((filter) => (
                <button
                  className={status === filter.value ? 'chip is-active' : 'chip'}
                  type="button"
                  key={filter.label}
                  onClick={() => updateStatus(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </nav>
            {listingsQuery.isLoading ? (
              <LoadingState label="내 게시글을 불러오는 중" />
            ) : null}
            {listingsQuery.isError ? (
              <ErrorState
                title="내 게시글을 불러오지 못했어요"
                retry={() => void listingsQuery.refetch()}
              />
            ) : null}
            {listingsQuery.isSuccess && listings.length === 0 ? (
              <EmptyState
                title="해당 상태의 게시글이 없습니다"
                description="다른 상태를 선택하거나 새 상품을 등록해 보세요."
                action={
                  <Link className="button button--primary" to="/listings/new">
                    상품 등록하기
                  </Link>
                }
              />
            ) : null}
            {listings.length > 0 ? (
              <div className="my-listing-list">
                {listings.map((listing) => (
                  <MyListingCard listing={listing} key={listing.listingId} />
                ))}
              </div>
            ) : null}
            {listingsQuery.hasNextPage ? (
              <button
                className="load-more"
                type="button"
                disabled={listingsQuery.isFetchingNextPage}
                onClick={() => void listingsQuery.fetchNextPage()}
              >
                {listingsQuery.isFetchingNextPage
                  ? '불러오는 중…'
                  : '게시글 더 보기'}
              </button>
            ) : null}
          </section>
        ) : null}

        {tab === 'requests' ? (
          <section
            role="tabpanel"
            id="activity-panel-requests"
            aria-labelledby="activity-tab-requests"
            className="activity-panel"
          >
            {requestsQuery.isLoading ? (
              <LoadingState label="받은 요청을 불러오는 중" />
            ) : null}
            {requestsQuery.isError ? (
              <ErrorState
                title="받은 요청을 불러오지 못했어요"
                retry={() => void requestsQuery.refetch()}
              />
            ) : null}
            {requestsQuery.isSuccess && requests.length === 0 ? (
              <EmptyState
                title="새로운 거래 요청이 없습니다"
                description="요청이 도착하면 이곳에서 바로 확인할 수 있어요."
              />
            ) : null}
            {requests.length > 0 ? (
              <div className="my-request-list">
                {requests.map((trade) => (
                  <PendingRequestCard trade={trade} key={trade.tradeId} />
                ))}
              </div>
            ) : null}
            {requestsQuery.hasNextPage ? (
              <button
                className="load-more"
                type="button"
                disabled={requestsQuery.isFetchingNextPage}
                onClick={() => void requestsQuery.fetchNextPage()}
              >
                {requestsQuery.isFetchingNextPage
                  ? '불러오는 중…'
                  : '요청 더 보기'}
              </button>
            ) : null}
          </section>
        ) : null}

        {tab === 'reviews' ? (
          <section
            role="tabpanel"
            id="activity-panel-reviews"
            aria-labelledby="activity-tab-reviews"
            className="activity-panel"
          >
            {reviewsQuery.isLoading ? (
              <LoadingState label="받은 후기를 불러오는 중" />
            ) : null}
            {reviewsQuery.isError ? (
              <ErrorState
                title="받은 후기를 불러오지 못했어요"
                retry={() => void reviewsQuery.refetch()}
              />
            ) : null}
            {reviewsQuery.isSuccess && reviews.length === 0 ? (
              <EmptyState
                title="아직 받은 후기가 없습니다"
                description="거래를 완료하면 상대방이 남긴 후기를 모아볼 수 있어요."
              />
            ) : null}
            {reviews.length > 0 ? (
              <div className="received-review-list">
                {reviews.map((review) => (
                  <ReceivedReviewCard review={review} key={review.reviewId} />
                ))}
              </div>
            ) : null}
            {reviewsQuery.hasNextPage ? (
              <button
                className="load-more"
                type="button"
                disabled={reviewsQuery.isFetchingNextPage}
                onClick={() => void reviewsQuery.fetchNextPage()}
              >
                {reviewsQuery.isFetchingNextPage
                  ? '불러오는 중…'
                  : '후기 더 보기'}
              </button>
            ) : null}
          </section>
        ) : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
