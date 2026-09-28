import { FilterX, Search, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminListingActionDialog } from '@/features/admin/components/AdminListingActionDialog'
import type { AdminListingAction } from '@/features/admin/components/AdminListingActionDialog'
import {
  useAdminListings,
  useChangeAdminListingStatus,
  useDeleteAdminListing,
} from '@/features/admin/model/listingQueries'
import type {
  AdminListingResponse,
  AdminListingStatusFilter,
} from '@/features/admin/model/types'
import { usesAuthMocks } from '@/features/auth/lib/authMode'
import { ListingStatusBadge } from '@/features/listings/components/ListingStatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { useToastStore } from '@/shared/state/toastStore'

const numberFormatter = new Intl.NumberFormat('ko-KR')
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const statusFilters: Array<{
  value: AdminListingStatusFilter | null
  label: string
}> = [
  { value: null, label: '전체' },
  { value: 'ON_SALE', label: '판매중' },
  { value: 'RESERVED', label: '예약중' },
  { value: 'COMPLETED', label: '거래완료' },
  { value: 'HIDDEN', label: '숨김' },
  { value: 'DELETED', label: '삭제됨' },
]

function isAdminListingStatus(
  value: string | null,
): value is AdminListingStatusFilter {
  return [
    'ON_SALE',
    'RESERVED',
    'COMPLETED',
    'HIDDEN',
    'DELETED',
  ].includes(value ?? '')
}

function parseSellerId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null
  const sellerId = Number(value)
  return Number.isSafeInteger(sellerId) && sellerId > 0 ? sellerId : null
}

export function AdminListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const showToast = useToastStore((state) => state.show)
  const rawStatus = searchParams.get('status')
  const status = isAdminListingStatus(rawStatus) ? rawStatus : null
  const keyword = searchParams.get('keyword')?.trim() ?? ''
  const sellerId = parseSellerId(searchParams.get('sellerId'))
  const [keywordDraft, setKeywordDraft] = useState(keyword)
  const [sellerIdDraft, setSellerIdDraft] = useState(
    sellerId === null ? '' : String(sellerId),
  )
  const [sellerIdError, setSellerIdError] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<{
    listing: AdminListingResponse
    action: AdminListingAction
  } | null>(null)
  const listingsQuery = useAdminListings({ status, keyword, sellerId })
  const changeStatus = useChangeAdminListingStatus()
  const deleteListing = useDeleteAdminListing()
  const listings = listingsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const isActionPending = changeStatus.isPending || deleteListing.isPending
  const actionError = changeStatus.error ?? deleteListing.error

  const updateStatus = (nextStatus: AdminListingStatusFilter | null) => {
    const next = new URLSearchParams(searchParams)
    if (nextStatus) next.set('status', nextStatus)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }

  const applySearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedSellerId = sellerIdDraft.trim()
    const parsedSellerId = parseSellerId(trimmedSellerId)
    if (trimmedSellerId && parsedSellerId === null) {
      setSellerIdError('판매자 ID는 1 이상의 숫자로 입력해 주세요.')
      return
    }

    setSellerIdError(null)
    const next = new URLSearchParams(searchParams)
    const trimmedKeyword = keywordDraft.trim()
    if (trimmedKeyword) next.set('keyword', trimmedKeyword)
    else next.delete('keyword')
    if (parsedSellerId !== null) next.set('sellerId', String(parsedSellerId))
    else next.delete('sellerId')
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setKeywordDraft('')
    setSellerIdDraft('')
    setSellerIdError(null)
    setSearchParams({}, { replace: true })
  }

  const openAction = (
    listing: AdminListingResponse,
    action: AdminListingAction,
  ) => {
    changeStatus.reset()
    deleteListing.reset()
    setSelectedAction({ listing, action })
  }

  const closeAction = () => {
    if (isActionPending) return
    setSelectedAction(null)
    changeStatus.reset()
    deleteListing.reset()
  }

  const runAction = (reason: string) => {
    if (!selectedAction) return
    const { listing, action } = selectedAction
    const onSuccess = () => {
      setSelectedAction(null)
      showToast(
        action === 'HIDE'
          ? '게시글을 숨겼습니다.'
          : action === 'RESTORE'
            ? '게시글을 복구했습니다.'
            : '게시글을 삭제했습니다.',
      )
    }

    if (action === 'DELETE') {
      deleteListing.mutate({ listingId: listing.listingId, reason }, { onSuccess })
      return
    }
    changeStatus.mutate(
      {
        listingId: listing.listingId,
        status: action === 'HIDE' ? 'HIDDEN' : 'RESTORE',
        reason,
      },
      { onSuccess },
    )
  }

  return (
    <section className="admin-listings-page">
      <div className="admin-page-heading">
        <div>
          <span>
            <ShieldAlert size={16} aria-hidden="true" />
            콘텐츠 운영
          </span>
          <h1>게시글 관리</h1>
          <p>게시글을 검색하고 신고 현황에 따라 숨김·복구·삭제할 수 있습니다.</p>
        </div>
        <small>{usesAuthMocks ? 'ADMIN 권한 · Mock boundary' : 'ADMIN 권한'}</small>
      </div>

      <section className="admin-filter-card" aria-label="게시글 검색 필터">
        <nav className="admin-status-filter" aria-label="게시글 상태">
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
        <form className="admin-search-form" onSubmit={applySearch}>
          <label>
            <span className="sr-only">게시글 제목</span>
            <Search size={17} aria-hidden="true" />
            <input
              value={keywordDraft}
              placeholder="게시글 제목 검색"
              onChange={(event) => setKeywordDraft(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">판매자 ID</span>
            <input
              value={sellerIdDraft}
              inputMode="numeric"
              placeholder="판매자 ID"
              aria-invalid={sellerIdError ? 'true' : 'false'}
              onChange={(event) => {
                setSellerIdDraft(event.target.value)
                setSellerIdError(null)
              }}
            />
          </label>
          <button className="button button--primary" type="submit">
            검색
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={clearFilters}
          >
            <FilterX size={16} aria-hidden="true" />
            초기화
          </button>
        </form>
        {sellerIdError ? (
          <p className="field-error" role="alert">
            {sellerIdError}
          </p>
        ) : null}
      </section>

      {listingsQuery.isLoading ? (
        <LoadingState label="관리자 게시글을 불러오는 중" />
      ) : null}
      {listingsQuery.isError ? (
        <ErrorState
          title="관리자 게시글을 불러오지 못했어요"
          retry={() => void listingsQuery.refetch()}
        />
      ) : null}
      {listingsQuery.isSuccess && listings.length === 0 ? (
        <EmptyState
          title="조건에 맞는 게시글이 없습니다"
          description="상태나 검색 조건을 바꿔 다시 확인해 주세요."
        />
      ) : null}
      {listings.length > 0 ? (
        <div className="admin-table-card">
          <div className="admin-table-summary">
            <strong>게시글 목록</strong>
            <span>현재 {listings.length}건 표시</span>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <caption className="sr-only">관리자 게시글 목록</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">게시글</th>
                  <th scope="col">판매자</th>
                  <th scope="col">상태</th>
                  <th scope="col">신고</th>
                  <th scope="col">등록일</th>
                  <th scope="col">조치</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.listingId}>
                    <td>#{listing.listingId}</td>
                    <td>
                      <div className="admin-listing-cell">
                        <strong>{listing.title}</strong>
                        <span>{numberFormatter.format(listing.price)}원</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-seller-cell">
                        <strong>{listing.seller.nickname}</strong>
                        <span>ID {listing.seller.userId}</span>
                      </div>
                    </td>
                    <td>
                      {listing.isDeleted ? (
                        <span className="admin-deleted-badge">삭제됨</span>
                      ) : (
                        <ListingStatusBadge status={listing.status} />
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          listing.reportCount > 0
                            ? 'admin-report-count has-reports'
                            : 'admin-report-count'
                        }
                      >
                        {listing.reportCount}건
                      </span>
                    </td>
                    <td>
                      <time dateTime={listing.createdAt}>
                        {dateFormatter.format(new Date(listing.createdAt))}
                      </time>
                    </td>
                    <td>
                      {listing.isDeleted ? (
                        <span className="admin-action-complete">조치 완료</span>
                      ) : (
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            onClick={() =>
                              openAction(
                                listing,
                                listing.status === 'HIDDEN' ? 'RESTORE' : 'HIDE',
                              )
                            }
                            aria-label={`${listing.title} ${
                              listing.status === 'HIDDEN' ? '복구' : '숨김'
                            }`}
                          >
                            {listing.status === 'HIDDEN' ? '복구' : '숨김'}
                          </button>
                          <button
                            className="is-danger"
                            type="button"
                            onClick={() => openAction(listing, 'DELETE')}
                            aria-label={`${listing.title} 삭제`}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {selectedAction ? (
        <AdminListingActionDialog
          listing={selectedAction.listing}
          action={selectedAction.action}
          isPending={isActionPending}
          requestError={
            actionError instanceof Error ? actionError.message : actionError ? '조치에 실패했습니다.' : null
          }
          onClose={closeAction}
          onClearError={() => {
            changeStatus.reset()
            deleteListing.reset()
          }}
          onConfirm={runAction}
        />
      ) : null}
    </section>
  )
}
