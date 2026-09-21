import { FilterX, History, Search, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminTrades } from '@/features/admin/model/tradeQueries'
import type { AdminTradeStatusFilter } from '@/features/admin/model/tradeTypes'
import { TradeStatusBadge } from '@/features/trades/components/TradeStatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'

const numberFormatter = new Intl.NumberFormat('ko-KR')
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const statusFilters: Array<{
  value: AdminTradeStatusFilter | null
  label: string
}> = [
  { value: null, label: '전체' },
  { value: 'REQUESTED', label: '요청' },
  { value: 'ACCEPTED', label: '승인' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELED', label: '취소' },
]

function isAdminTradeStatus(
  value: string | null,
): value is AdminTradeStatusFilter {
  return ['REQUESTED', 'ACCEPTED', 'COMPLETED', 'CANCELED'].includes(
    value ?? '',
  )
}

function parseUserId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null
  const userId = Number(value)
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null
}

function AdminTradeUserFilter({
  userId,
  onApply,
  onClear,
}: {
  userId: number | null
  onApply: (userId: number | null) => void
  onClear: () => void
}) {
  const [userIdDraft, setUserIdDraft] = useState(
    userId === null ? '' : String(userId),
  )
  const [userIdError, setUserIdError] = useState<string | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedUserId = userIdDraft.trim()
    const parsedUserId = parseUserId(trimmedUserId)
    if (trimmedUserId && parsedUserId === null) {
      setUserIdError('회원 ID는 1 이상의 숫자로 입력해 주세요.')
      return
    }

    setUserIdError(null)
    onApply(parsedUserId)
  }

  const clear = () => {
    setUserIdDraft('')
    setUserIdError(null)
    onClear()
  }

  return (
    <>
      <form
        className="admin-search-form admin-search-form--trade"
        onSubmit={submit}
      >
        <label>
          <span className="sr-only">회원 ID</span>
          <UserRound size={17} aria-hidden="true" />
          <input
            value={userIdDraft}
            inputMode="numeric"
            placeholder="판매자 또는 구매자 회원 ID"
            aria-invalid={userIdError ? 'true' : 'false'}
            onChange={(event) => {
              setUserIdDraft(event.target.value)
              setUserIdError(null)
            }}
          />
        </label>
        <button className="button button--primary" type="submit">
          <Search size={16} aria-hidden="true" />
          조회
        </button>
        <button
          className="button button--secondary"
          type="button"
          onClick={clear}
        >
          <FilterX size={16} aria-hidden="true" />
          초기화
        </button>
      </form>
      {userIdError ? (
        <p className="field-error" role="alert">
          {userIdError}
        </p>
      ) : null}
    </>
  )
}

export function AdminTradesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawStatus = searchParams.get('status')
  const status = isAdminTradeStatus(rawStatus) ? rawStatus : null
  const userId = parseUserId(searchParams.get('userId'))
  const tradesQuery = useAdminTrades({ status, userId })
  const trades = tradesQuery.data?.pages.flatMap((page) => page.items) ?? []

  const updateStatus = (nextStatus: AdminTradeStatusFilter | null) => {
    const next = new URLSearchParams(searchParams)
    if (nextStatus) next.set('status', nextStatus)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }

  const applyUserFilter = (nextUserId: number | null) => {
    const next = new URLSearchParams(searchParams)
    if (nextUserId !== null) next.set('userId', String(nextUserId))
    else next.delete('userId')
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setSearchParams({}, { replace: true })
  }

  return (
    <section className="admin-trades-page">
      <div className="admin-page-heading">
        <div>
          <span>
            <History size={16} aria-hidden="true" />
            거래 운영
          </span>
          <h1>거래 내역</h1>
          <p>전체 거래 상태와 참여 회원을 조회합니다. 거래 조치는 제공하지 않습니다.</p>
        </div>
        <small>READ ONLY</small>
      </div>

      <section className="admin-filter-card" aria-label="거래 내역 필터">
        <nav className="admin-status-filter" aria-label="거래 상태">
          {statusFilters.map((filter) => (
            <button
              type="button"
              className={status === filter.value ? 'is-active' : ''}
              key={filter.label}
              onClick={() => updateStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </nav>
        <AdminTradeUserFilter
          key={userId ?? 'all'}
          userId={userId}
          onApply={applyUserFilter}
          onClear={clearFilters}
        />
      </section>

      {tradesQuery.isLoading ? (
        <LoadingState label="관리자 거래 내역을 불러오는 중" />
      ) : null}
      {tradesQuery.isError ? (
        <ErrorState
          title="관리자 거래 내역을 불러오지 못했어요"
          retry={() => void tradesQuery.refetch()}
        />
      ) : null}
      {tradesQuery.isSuccess && trades.length === 0 ? (
        <EmptyState
          title="조건에 맞는 거래가 없습니다"
          description="상태나 회원 ID 조건을 바꿔 다시 확인해 주세요."
        />
      ) : null}
      {trades.length > 0 ? (
        <div className="admin-table-card">
          <div className="admin-table-summary">
            <strong>거래 내역</strong>
            <span>현재 {trades.length}건 표시</span>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table admin-trade-table">
              <caption className="sr-only">관리자 거래 내역 조회 결과</caption>
              <thead>
                <tr>
                  <th scope="col">거래 ID</th>
                  <th scope="col">상품</th>
                  <th scope="col">판매자</th>
                  <th scope="col">구매자</th>
                  <th scope="col">상태</th>
                  <th scope="col">요청일</th>
                  <th scope="col">완료일</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.tradeId}>
                    <td>#{trade.tradeId}</td>
                    <td>
                      <div className="admin-listing-cell">
                        <strong>{trade.listing.title}</strong>
                        <span>
                          상품 #{trade.listing.listingId} ·{' '}
                          {numberFormatter.format(trade.listing.price)}원
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-seller-cell">
                        <strong>{trade.seller.nickname}</strong>
                        <span>ID {trade.seller.userId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-seller-cell">
                        <strong>{trade.buyer.nickname}</strong>
                        <span>ID {trade.buyer.userId}</span>
                      </div>
                    </td>
                    <td>
                      <TradeStatusBadge status={trade.status} />
                    </td>
                    <td className="admin-date-cell">
                      <time dateTime={trade.requestedAt}>
                        {dateFormatter.format(new Date(trade.requestedAt))}
                      </time>
                    </td>
                    <td className="admin-date-cell">
                      {trade.completedAt ? (
                        <time dateTime={trade.completedAt}>
                          {dateFormatter.format(new Date(trade.completedAt))}
                        </time>
                      ) : (
                        <span className="admin-incomplete-date">미완료</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </section>
  )
}
