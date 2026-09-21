import {
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  MoreHorizontal,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ListingStatusBadge } from '@/features/listings/components/ListingStatusBadge'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { useListing } from '@/features/listings/model/queries'
import { useSetWish } from '@/features/wishes/model/queries'
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
  const listingId = Number(params.listingId)
  const listingQuery = useListing(listingId)
  const showToast = useToastStore((state) => state.show)
  const setWish = useSetWish()

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
            <button
              className="icon-button"
              type="button"
              aria-label="상품 더보기"
              onClick={() => showToast('신고 메뉴는 개발자 B 화면과 함께 연결됩니다.')}
            >
              <MoreHorizontal aria-hidden="true" />
            </button>
          )
        }
      />

      <main className="detail-shell">
        <div className="detail-media">
          <ProductImage
            className="product-image--detail"
            listingId={listing.listingId}
            url={listing.images[0]?.url ?? '/images/marketplace-products.png'}
            alt={`${listing.title} 상품 사진`}
          />
          <span className="image-count">1 / {listing.images.length || 1}</span>
        </div>

        <div className="detail-content">
          <button
            className="seller-card"
            type="button"
            onClick={() => showToast('판매자 프로필은 사용자 API 계약과 함께 연결됩니다.')}
          >
            <span className="avatar" aria-hidden="true">
              {listing.seller.nickname.slice(0, 1)}
            </span>
            <span className="seller-card__copy">
              <strong>{listing.seller.nickname}</strong>
              <span>
                거래 {listing.seller.completedTradeCount}회 · ★{' '}
                {listing.seller.averageRating.toFixed(1)}
              </span>
            </span>
            <span className="seller-trust">
              <ShieldCheck size={16} aria-hidden="true" />
              거래 정보
            </span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>

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
                {listing.seller.averageRating.toFixed(1)}
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
          <Link
            className="button button--primary detail-actions__main"
            to={`/listings/${listing.listingId}/edit`}
          >
            상품 정보 수정
          </Link>
        ) : (
          <>
            <button
              className="button button--secondary detail-actions__chat"
              type="button"
              onClick={() => showToast('채팅은 2단계에서 연결됩니다.')}
            >
              <MessageCircle size={19} aria-hidden="true" />
              채팅하기
            </button>
            <button
              className="button button--primary detail-actions__main"
              type="button"
              disabled={!canTrade}
              onClick={() => showToast('거래 요청은 2단계에서 연결됩니다.')}
            >
              {canTrade ? '거래 요청' : listing.status === 'RESERVED' ? '예약중' : '거래완료'}
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
