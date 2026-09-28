import {
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  MoreHorizontal,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListingImageCarousel } from '@/features/listings/components/ListingImageCarousel'
import { ListingStatusBadge } from '@/features/listings/components/ListingStatusBadge'
import {
  useDeleteListing,
  useListing,
} from '@/features/listings/model/queries'
import { useCreateChatRoom } from '@/features/chat/model/queries'
import { useSetWish } from '@/features/wishes/model/queries'
import { useCreateTrade } from '@/features/trades/model/queries'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToastStore } from '@/shared/state/toastStore'

const numberFormatter = new Intl.NumberFormat('ko-KR')
const conditionLabels = {
  NEW: '새상품',
  LIKE_NEW: '거의 새것',
  USED: '중고',
  DAMAGED: '하자 있음',
}
const tradeMethodLabels = {
  DIRECT: '직거래',
  DELIVERY: '택배거래',
  BOTH: '직거래 · 택배',
}

export function ListingDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const listingId = Number(params.listingId)
  const listingQuery = useListing(listingId)
  const showToast = useToastStore((state) => state.show)
  const setWish = useSetWish()
  const createTrade = useCreateTrade()
  const createChatRoom = useCreateChatRoom()
  const deleteListing = useDeleteListing()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (listingQuery.isLoading) {
    return (
      <div className="app-page">
        <PageHeader title="상품 상세" />
        <LoadingState label="상품 정보를 불러오는 중" />
      </div>
    )
  }

  if (listingQuery.isError || !listingQuery.data) {
    return (
      <div className="app-page">
        <PageHeader title="상품 상세" />
        <ErrorState retry={() => void listingQuery.refetch()} />
      </div>
    )
  }

  const listing = listingQuery.data
  const ratingText =
    listing.seller.averageRating === null
      ? '없음'
      : listing.seller.averageRating.toFixed(1)
  const isWished = listing.isWished
  const canTrade = listing.status === 'ON_SALE' && !listing.isMine

  const toggleWish = () => {
    const nextValue = !isWished
    setWish.mutate(
      { listingId, wished: nextValue },
      {
        onSuccess: () =>
          showToast(
            nextValue ? '관심 상품에 담았습니다.' : '관심 상품에서 제외했습니다.',
          ),
        onError: () => showToast('관심 상품을 변경하지 못했습니다.'),
      },
    )
  }

  const confirmDelete = () => {
    setDeleteError(null)
    deleteListing.mutate(listingId, {
      onSuccess: () => {
        showToast('상품을 삭제했습니다.')
        navigate('/', { replace: true })
      },
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : '상품을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'
        setDeleteError(message)
        showToast(message)
      },
    })
  }

  return (
    <div className="app-page detail-page">
      <PageHeader
        title="상품 상세"
        action={
          listing.isMine ? (
            <Link className="text-action" to={`/listings/${listing.listingId}/edit`}>
              수정
            </Link>
          ) : (
            <Link
              className="icon-button"
              aria-label="상품 신고"
              to={`/reports/new?targetType=LISTING&targetId=${listing.listingId}`}
            >
              <MoreHorizontal aria-hidden="true" />
            </Link>
          )
        }
      />

      <main className="detail-shell">
        <ListingImageCarousel
          key={`${listing.listingId}:${listing.images
            .map((image) => `${image.imageId}-${image.displayOrder}`)
            .join(',')}`}
          listingId={listing.listingId}
          title={listing.title}
          images={listing.images}
        />

        <div className="detail-content">
          <Link
            className="seller-card"
            to={`/users/${listing.seller.userId}`}
          >
            <span className="avatar" aria-hidden="true">
              {listing.seller.nickname.slice(0, 1)}
            </span>
            <span className="seller-card__copy">
              <strong>{listing.seller.nickname}</strong>
              <span>
                거래 {listing.seller.completedTradeCount}회 · ★{' '}
                {ratingText}
              </span>
            </span>
            <span className="seller-trust">
              <ShieldCheck size={16} aria-hidden="true" />
              거래 정보
            </span>
            <ChevronRight size={19} aria-hidden="true" />
          </Link>

          <article className="product-copy">
            <ListingStatusBadge status={listing.status} />
            <h1>{listing.title}</h1>
            <p className="product-price">{numberFormatter.format(listing.price)}원</p>
            <div className="product-tags">
              <span>{listing.category.name}</span>
              <span>{conditionLabels[listing.itemCondition]}</span>
              <span>{tradeMethodLabels[listing.tradeMethod]}</span>
            </div>
            <p className="product-description">{listing.description}</p>
            <div className="product-stats">
              <span>
                <Heart size={16} aria-hidden="true" /> 관심{' '}
                {listing.wishCount}
              </span>
              <span>
                <Eye size={16} aria-hidden="true" /> 조회 {listing.viewCount}
              </span>
              <span>
                <Star size={16} aria-hidden="true" /> 평점{' '}
                {ratingText}
              </span>
            </div>
          </article>
        </div>
      </main>

      <footer className="detail-actions">
        {!listing.isMine ? (
          <button
            className={isWished ? 'wish-button is-active' : 'wish-button'}
            type="button"
            onClick={toggleWish}
            disabled={setWish.isPending}
            aria-pressed={isWished}
            aria-label={isWished ? '관심 상품 해제' : '관심 상품 등록'}
          >
            <Heart fill={isWished ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        ) : null}
        {listing.isMine ? (
          <>
            <button
              className="button button--danger-outline detail-actions__delete"
              type="button"
              onClick={() => {
                setDeleteError(null)
                setDeleteDialogOpen(true)
              }}
            >
              <Trash2 size={18} aria-hidden="true" />
              상품 삭제
            </button>
            <Link
              className="button button--primary detail-actions__main"
              to={`/listings/${listing.listingId}/edit`}
            >
              상품 정보 수정
            </Link>
          </>
        ) : (
          <>
            <button
              className="button button--secondary detail-actions__chat"
              type="button"
              disabled={createChatRoom.isPending}
              onClick={() =>
                createChatRoom.mutate(listingId, {
                  onSuccess: ({ chatRoomId }) => navigate(`/chat/${chatRoomId}`),
                  onError: (error) =>
                    showToast(
                      error instanceof Error
                        ? error.message
                        : '채팅방을 열지 못했습니다.',
                    ),
                })
              }
            >
              <MessageCircle size={19} aria-hidden="true" />
              {createChatRoom.isPending ? '연결 중…' : '채팅하기'}
            </button>
            <button
              className="button button--primary detail-actions__main"
              type="button"
              disabled={!canTrade || createTrade.isPending}
              onClick={() =>
                createTrade.mutate(listingId, {
                  onSuccess: ({ tradeId }) => navigate(`/trades/${tradeId}`),
                  onError: (error) =>
                    showToast(
                      error instanceof Error
                        ? error.message
                        : '거래를 요청하지 못했습니다.',
                    ),
                })
              }
            >
              {createTrade.isPending
                ? '요청 중…'
                : canTrade
                  ? '거래 요청'
                  : listing.status === 'RESERVED'
                    ? '예약중'
                    : '거래완료'}
            </button>
          </>
        )}
      </footer>

      {deleteDialogOpen ? (
        <div
          className="confirm-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteListing.isPending) {
              setDeleteDialogOpen(false)
            }
          }}
        >
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-listing-title"
            aria-describedby="delete-listing-description"
          >
            <span className="confirm-dialog__icon" aria-hidden="true">
              <Trash2 size={22} />
            </span>
            <h2 id="delete-listing-title">상품을 삭제할까요?</h2>
            <p id="delete-listing-description">
              삭제한 상품은 다시 복구할 수 없습니다. 진행 중인 거래가 있다면 먼저
              거래를 종료해야 합니다.
            </p>
            {deleteError ? (
              <p className="confirm-dialog__error" role="alert">
                {deleteError}
              </p>
            ) : null}
            <div className="confirm-dialog__actions">
              <button
                className="button button--secondary"
                type="button"
                disabled={deleteListing.isPending}
                onClick={() => setDeleteDialogOpen(false)}
              >
                취소
              </button>
              <button
                className="button button--danger"
                type="button"
                disabled={deleteListing.isPending}
                onClick={confirmDelete}
              >
                {deleteListing.isPending ? '삭제하는 중…' : '삭제하기'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
