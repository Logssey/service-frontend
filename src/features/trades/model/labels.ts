import type { TradeStatus } from '@/features/trades/model/types'

export const tradeStatusLabels: Record<TradeStatus, string> = {
  REQUESTED: '요청됨',
  ACCEPTED: '거래 승인',
  COMPLETED: '거래 완료',
  REJECTED: '요청 거절',
  CANCELED: '거래 취소',
}
