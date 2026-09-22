import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { TradeStatusBadge } from '@/features/trades/components/TradeStatusBadge'
import type { TradeSummaryResponse } from '@/features/trades/model/types'

const numberFormatter = new Intl.NumberFormat('ko-KR')
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function PendingRequestCard({ trade }: { trade: TradeSummaryResponse }) {
  return (
    <article className="my-request-card">
      <Link to={`/trades/${trade.tradeId}`}>
        <ProductImage
          listingId={trade.listing.listingId}
          url={trade.listing.thumbnailUrl}
          alt={`${trade.listing.title} 상품 사진`}
        />
        <div className="my-request-card__body">
          <div className="my-request-card__topline">
            <TradeStatusBadge status={trade.status} />
            <time dateTime={trade.requestedAt}>
              {dateFormatter.format(new Date(trade.requestedAt))}
            </time>
          </div>
          <h2>{trade.listing.title}</h2>
          <strong>{numberFormatter.format(trade.listing.price)}원</strong>
          <p>
            <span className="avatar avatar--small" aria-hidden="true">
              {trade.counterparty.nickname.slice(0, 1)}
            </span>
            {trade.counterparty.nickname}님의 구매 요청
          </p>
        </div>
        <ChevronRight aria-hidden="true" />
      </Link>
    </article>
  )
}
