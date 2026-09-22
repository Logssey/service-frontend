import { Heart, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListingCard } from '@/features/listings/components/ListingCard'
import { useSetWish, useWishes } from '@/features/wishes/model/queries'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import { useToastStore } from '@/shared/state/toastStore'
import { useState } from 'react'

export function WishesPage() {
  const wishesQuery = useWishes()
  const setWish = useSetWish()
  const showToast = useToastStore((state) => state.show)
  const [hiddenListingIds, setHiddenListingIds] = useState(() => new Set<number>())
  const listings =
    wishesQuery.data?.pages
      .flatMap((page) => page.items)
      .filter((listing) => !hiddenListingIds.has(listing.listingId)) ?? []

  const removeWish = (listingId: number) => {
    setHiddenListingIds((current) => new Set(current).add(listingId))
    setWish.mutate(
      { listingId, wished: false },
      {
        onSuccess: () => showToast('관심 상품에서 제외했습니다.'),
        onError: () => {
          setHiddenListingIds((current) => {
            const next = new Set(current)
            next.delete(listingId)
            return next
          })
          showToast('관심 상품을 해제하지 못했습니다. 다시 시도해 주세요.')
        },
      },
    )
  }

  return (
    <div className="app-page collection-page">
      <PageHeader
        title="찜 목록"
        action={
          <Link className="text-action" to="/trades">
            거래
          </Link>
        }
      />
      <main className="content-shell collection-content">
        <div className="collection-heading">
          <div>
            <span className="eyebrow">
              <Heart size={15} fill="currentColor" aria-hidden="true" />
              다시 보고 싶은 상품
            </span>
            <h1>관심 상품</h1>
          </div>
          {!wishesQuery.isLoading ? <span>{listings.length}개</span> : null}
        </div>

        {wishesQuery.isLoading ? <LoadingState label="찜 목록을 불러오는 중" /> : null}
        {wishesQuery.isError ? (
          <ErrorState
            title="찜 목록을 불러오지 못했어요"
            retry={() => void wishesQuery.refetch()}
          />
        ) : null}
        {wishesQuery.isSuccess && listings.length === 0 ? (
          <EmptyState
            title="관심 상품이 없습니다"
            description="마음에 드는 상품의 하트를 누르면 이곳에서 모아볼 수 있어요."
            action={
              <Link className="button button--primary" to="/">
                <ShoppingBag size={18} aria-hidden="true" />
                상품 둘러보기
              </Link>
            }
          />
        ) : null}
        {listings.length > 0 ? (
          <div className="listing-grid wish-grid">
            {listings.map((listing) => (
              <div className="wish-card" key={listing.listingId}>
                <ListingCard listing={listing} />
                <button
                  className="wish-card__remove"
                  type="button"
                  aria-label={`${listing.title} 관심 해제`}
                  disabled={setWish.isPending}
                  onClick={() => removeWish(listing.listingId)}
                >
                  <Heart fill="currentColor" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {wishesQuery.hasNextPage ? (
          <button
            className="load-more"
            type="button"
            disabled={wishesQuery.isFetchingNextPage}
            onClick={() => void wishesQuery.fetchNextPage()}
          >
            {wishesQuery.isFetchingNextPage ? '불러오는 중…' : '상품 더 보기'}
          </button>
        ) : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
