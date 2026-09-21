import type { TradeStatus } from '@/features/trades/model/types'
import { tradeStatusLabels } from '@/features/trades/model/labels'

export function TradeStatusBadge({ status }: { status: TradeStatus }) {
  return (
    <span className={`trade-status trade-status--${status.toLowerCase()}`}>
      {tradeStatusLabels[status]}
    </span>
  )
}
