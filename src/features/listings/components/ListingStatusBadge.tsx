import type { ListingStatus } from '@/features/listings/model/types'

const statusLabels: Record<ListingStatus, string> = {
  ON_SALE: '판매중',
  RESERVED: '예약중',
  COMPLETED: '거래완료',
  HIDDEN: '숨김',
}

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {statusLabels[status]}
    </span>
  )
}
