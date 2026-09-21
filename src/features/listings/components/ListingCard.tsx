import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListingStatusBadge } from '@/features/listings/components/ListingStatusBadge'
import { ProductImage } from '@/features/listings/components/ProductImage'
import type { ListingSummaryResponse } from '@/features/listings/model/types'

const numberFormatter = new Intl.NumberFormat('ko-KR')

export function ListingCard({ listing }: { listing: ListingSummaryResponse }) {
  return (
    <article className="listing-card">
      <Link to={`/listings/${listing.listingId}`}>
        <div className="listing-card__image-wrap">
          <ProductImage
            listingId={listing.listingId}
            url={listing.thumbnailUrl}
            alt={`${listing.title} 상품 사진`}
          />
          {listing.status !== 'ON_SALE' ? (
            <ListingStatusBadge status={listing.status} />
          ) : null}
        </div>
        <div className="listing-card__body">
          <h3>{listing.title}</h3>
          <div className="listing-card__price">
            {numberFormatter.format(listing.price)}원
          </div>
          <div className="listing-card__meta">
            <span>{listing.seller.nickname}</span>
            <span aria-label={`관심 ${listing.wishCount}개`}>
              <Heart size={14} aria-hidden="true" />
              {listing.wishCount}
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
