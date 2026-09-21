import { ChevronRight, MessageCircle, Star } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { TradeStatusBadge } from '@/features/trades/components/TradeStatusBadge'
import { useTrades } from '@/features/trades/model/queries'
import type {
  TradeRoleFilter,
  TradeStatus,
} from '@/features/trades/model/types'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import { useToastStore } from '@/shared/state/toastStore'

const numberFormatter = new Intl.NumberFormat('ko-KR')
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
})

const statusFilters: Array<{ value: TradeStatus | null; label: string }> = [
  { value: null, label: '전체' },
  { value: 'REQUESTED', label: '요청' },
  { value: 'ACCEPTED', label: '승인' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELED', label: '취소' },
]

function isTradeStatus(value: string | null): value is TradeStatus {
  return ['REQUESTED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELED'].includes(
    value ?? '',
  )
}

export function TradesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const showToast = useToastStore((state) => state.show)
  const role: TradeRoleFilter =
    searchParams.get('role') === 'seller' ? 'seller' : 'buyer'
  const rawStatus = searchParams.get('status')
  const status = isTradeStatus(rawStatus) ? rawStatus : null
  const tradesQuery = useTrades(role, status)
  const trades = tradesQuery.data?.pages.flatMap((page) => page.items) ?? []

  const updateFilter = (nextRole: TradeRoleFilter, nextStatus: TradeStatus | null) => {
    const next = new URLSearchParams({ role: nextRole })
    if (nextStatus) next.set('status', nextStatus)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="app-page collection-page">
      <PageHeader
        title="거래 내역"
        action={
          <Link className="icon-button" to="/chat" aria-label="채팅 목록">
            <MessageCircle size={20} aria-hidden="true" />
          </Link>
        }
      />
      <main className="content-shell trade-list-content">
        <div className="segmented-tabs" aria-label="거래 역할">
          <button
            type="button"
            className={role === 'buyer' ? 'is-active' : ''}
            aria-pressed={role === 'buyer'}
            onClick={() => updateFilter('buyer', status)}
          >
            구매 내역
          </button>
          <button
            type="button"
            className={role === 'seller' ? 'is-active' : ''}
            aria-pressed={role === 'seller'}
            onClick={() => updateFilter('seller', status)}
          >
            판매 내역
          </button>
        </div>

        <nav className="status-filter" aria-label="거래 상태">
          {statusFilters.map((filter) => (
            <button
              className={status === filter.value ? 'chip is-active' : 'chip'}
              type="button"
              key={filter.label}
              onClick={() => updateFilter(role, filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </nav>

        {tradesQuery.isLoading ? <LoadingState label="거래 내역을 불러오는 중" /> : null}
        {tradesQuery.isError ? (
          <ErrorState
            title="거래 내역을 불러오지 못했어요"
            retry={() => void tradesQuery.refetch()}
          />
        ) : null}
        {tradesQuery.isSuccess && trades.length === 0 ? (
          <EmptyState
            title="해당하는 거래가 없습니다"
            description="다른 역할이나 상태를 선택해 보세요."
            action={
              <Link className="button button--primary" to="/">
                상품 둘러보기
              </Link>
            }
          />
        ) : null}
        {trades.length > 0 ? (
          <div className="trade-list">
            {trades.map((trade) => (
              <article className="trade-card" key={trade.tradeId}>
                <Link to={`/trades/${trade.tradeId}`}>
                  <ProductImage
                    listingId={trade.listing.listingId}
                    url={trade.listing.thumbnailUrl}
                    alt={`${trade.listing.title} 상품 사진`}
                  />
                  <div className="trade-card__body">
                    <div className="trade-card__topline">
                      <TradeStatusBadge status={trade.status} />
                      <time dateTime={trade.requestedAt}>
                        {dateFormatter.format(new Date(trade.requestedAt))}
                      </time>
                    </div>
                    <h2>{trade.listing.title}</h2>
                    <strong>{numberFormatter.format(trade.listing.price)}원</strong>
                    <p>
                      {trade.myRole === 'BUYER' ? '판매자' : '구매자'} ·{' '}
                      {trade.counterparty.nickname}
                    </p>
                  </div>
                  <ChevronRight aria-hidden="true" />
                </Link>
                {trade.status === 'COMPLETED' && !trade.reviewWritten ? (
                  <button
                    className="trade-card__review"
                    type="button"
                    onClick={() => showToast('후기 작성은 다음 단계에서 연결됩니다.')}
                  >
                    <Star size={16} aria-hidden="true" />
                    후기 쓰기
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
        {tradesQuery.hasNextPage ? (
          <button
            className="load-more"
            type="button"
            disabled={tradesQuery.isFetchingNextPage}
            onClick={() => void tradesQuery.fetchNextPage()}
          >
            {tradesQuery.isFetchingNextPage ? '불러오는 중…' : '거래 더 보기'}
          </button>
        ) : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
