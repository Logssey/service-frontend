import type {
  TradeAction,
  TradeCloseRequest,
  TradeCreateRequest,
  TradeCreateResponse,
  TradeDetailResponse,
  TradePage,
  TradeSearchRequest,
  TradeStatusResponse,
} from '@/features/trades/model/types'
import { mockTradeRepository } from '@/mocks/tradeRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

function toSearchParams(request: TradeSearchRequest) {
  const params = new URLSearchParams({
    role: request.role,
    size: String(request.size ?? 20),
  })
  if (request.status) params.set('status', request.status)
  if (request.cursor) params.set('cursor', request.cursor)
  return params
}

export const tradesApi = {
  async getTrades(request: TradeSearchRequest): Promise<TradePage> {
    if (useMocks) return mockTradeRepository.getTrades(request)
    return apiRequest<TradePage>(`/trades?${toSearchParams(request)}`)
  },

  async getTrade(tradeId: number): Promise<TradeDetailResponse> {
    if (useMocks) return mockTradeRepository.getTrade(tradeId)
    return apiRequest<TradeDetailResponse>(`/trades/${tradeId}`)
  },

  async createTrade(request: TradeCreateRequest): Promise<TradeCreateResponse> {
    if (useMocks) return mockTradeRepository.createTrade(request.listingId)
    return apiRequest<TradeCreateResponse>('/trades', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async changeStatus(
    tradeId: number,
    action: TradeAction,
    request?: TradeCloseRequest,
  ): Promise<TradeStatusResponse> {
    if (useMocks) {
      return mockTradeRepository.changeStatus(tradeId, action, request?.reason)
    }
    return apiRequest<TradeStatusResponse>(`/trades/${tradeId}/${action}`, {
      method: 'POST',
      body:
        action === 'reject' || action === 'cancel'
          ? JSON.stringify(request ?? {})
          : undefined,
    })
  },
}
