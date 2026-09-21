import { Bell, ChevronDown, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListingCard } from '@/features/listings/components/ListingCard'
import { useListingFilterStore } from '@/features/listings/model/listingStore'
import { useCategories, useListings } from '@/features/listings/model/queries'
import type { ListingSort } from '@/features/listings/model/types'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import { useToastStore } from '@/shared/state/toastStore'

export function ListingsPage() {
  const filterStore = useListingFilterStore()
  const showToast = useToastStore((state) => state.show)
  const filters = {
    keyword: filterStore.keyword,
    categoryId: filterStore.categoryId,
    status: filterStore.status,
    minPrice: filterStore.minPrice,
    maxPrice: filterStore.maxPrice,
    itemCondition: filterStore.itemCondition,
    sort: filterStore.sort,
  }
  const categoriesQuery = useCategories()
  const listingsQuery = useListings(filters)
  const listings = listingsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const hasActiveFilters = Boolean(
    filters.keyword ||
      filters.categoryId ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.itemCondition,
  )

  return (
    <div className="app-page home-page">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Re:Used 홈">
          <span className="brand__mark" aria-hidden="true">R</span>
          <span>Re:Used</span>
        </Link>
        <Link className="desktop-search" to="/search">
          <Search size={18} aria-hidden="true" />
          <span>{filters.keyword || '어떤 물건을 찾고 계세요?'}</span>
        </Link>
        <div className="site-header__actions">
          <Link className="icon-button mobile-only" to="/search" aria-label="검색">
            <Search aria-hidden="true" />
          </Link>
          <button
            className="icon-button notification-button"
            type="button"
            aria-label="알림"
            onClick={() => showToast('알림 화면은 다음 단계에서 연결됩니다.')}
          >
            <Bell aria-hidden="true" />
            <span aria-label="읽지 않은 알림 2개" />
          </button>
          <Link className="sell-button sell-button--desktop" to="/listings/new">
            판매하기
          </Link>
        </div>
      </header>

      <main className="content-shell home-content">
        <section className="home-intro" aria-labelledby="home-heading">
          <div>
            <span className="eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              오늘 새로 올라온 물건
            </span>
            <h1 id="home-heading">다시 쓰는 좋은 물건</h1>
            <p>상태와 가격을 꼼꼼히 보고, 믿을 수 있는 이웃과 거래해 보세요.</p>
          </div>
          <Link className="filter-summary" to="/search">
            <SlidersHorizontal size={18} aria-hidden="true" />
            {hasActiveFilters ? '필터 적용됨' : '상세 필터'}
          </Link>
        </section>

        <nav className="category-strip" aria-label="상품 카테고리">
          <button
            className={filters.categoryId === null ? 'chip is-active' : 'chip'}
            type="button"
            onClick={() => filterStore.setCategoryId(null)}
          >
            전체
          </button>
          {categoriesQuery.data?.map((category) => (
            <button
              className={
                filters.categoryId === category.categoryId ? 'chip is-active' : 'chip'
              }
              type="button"
              key={category.categoryId}
              onClick={() => filterStore.setCategoryId(category.categoryId)}
            >
              {category.name}
            </button>
          ))}
        </nav>

        <section className="listing-section" aria-labelledby="listing-heading">
          <div className="section-toolbar">
            <div>
              <h2 id="listing-heading">
                {filters.keyword ? `‘${filters.keyword}’ 검색 결과` : '전체 상품'}
              </h2>
              {!listingsQuery.isLoading ? (
                <span>
                  {listings.length}개{listingsQuery.hasNextPage ? ' 이상' : ''}
                </span>
              ) : null}
            </div>
            <label className="sort-select">
              <span className="sr-only">정렬 기준</span>
              <select
                value={filters.sort}
                onChange={(event) =>
                  filterStore.setSort(event.target.value as ListingSort)
                }
              >
                <option value="latest">최신순</option>
                <option value="priceAsc">낮은 가격순</option>
                <option value="priceDesc">높은 가격순</option>
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </label>
          </div>

          {listingsQuery.isLoading ? <LoadingState /> : null}
          {listingsQuery.isError ? (
            <ErrorState retry={() => void listingsQuery.refetch()} />
          ) : null}
          {listingsQuery.isSuccess && listings.length === 0 ? (
            <EmptyState
              title="조건에 맞는 상품이 없어요"
              description="검색어나 필터를 바꾸면 더 많은 상품을 볼 수 있어요."
              action={
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={filterStore.reset}
                >
                  필터 초기화
                </button>
              }
            />
          ) : null}
          {listings.length > 0 ? (
            <div className="listing-grid">
              {listings.map((listing) => (
                <ListingCard listing={listing} key={listing.listingId} />
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
              {listingsQuery.isFetchingNextPage ? '불러오는 중…' : '상품 더 보기'}
            </button>
          ) : null}
        </section>
      </main>

      <Link className="sell-button sell-button--floating" to="/listings/new">
        <span aria-hidden="true">＋</span>
        판매하기
      </Link>
      <MobileBottomNavigation />
    </div>
  )
}
