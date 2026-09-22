import { Eye, Heart, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListingStatusBadge } from '@/features/listings/components/ListingStatusBadge'
import { ProductImage } from '@/features/listings/components/ProductImage'
import type { MyListingResponse } from '@/features/me/model/types'

const numberFormatter = new Intl.NumberFormat('ko-KR')
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
})

export function MyListingCard({ listing }: { listing: MyListingResponse }) {
  return (
    <article className="my-listing-card">
      <Link to={`/listings/${listing.listingId}`}>
        <ProductImage
          listingId={listing.listingId}
          url={listing.thumbnailUrl}
          alt={`${listing.title} 상품 사진`}
        />
        <div className="my-listing-card__body">
          <div className="my-listing-card__topline">
            <ListingStatusBadge status={listing.status} />
            <time dateTime={listing.createdAt}>
              {dateFormatter.format(new Date(listing.createdAt))}
            </time>
          </div>
          <h2>{listing.title}</h2>
          <strong>{numberFormatter.format(listing.price)}원</strong>
          <div className="my-listing-card__metrics">
            <span aria-label={`관심 ${listing.wishCount}개`}>
              <Heart size={15} aria-hidden="true" />
              {listing.wishCount}
            </span>
            <span aria-label={`조회 ${listing.viewCount}회`}>
              <Eye size={15} aria-hidden="true" />
              {listing.viewCount}
            </span>
            {listing.pendingTradeCount > 0 ? (
              <span
                className="my-listing-card__requests"
                aria-label={`대기 중인 거래 요청 ${listing.pendingTradeCount}개`}
              >
                <MessageCircle size={15} aria-hidden="true" />
                요청 {listing.pendingTradeCount}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  )
}
