import type {
  AdminTradePage,
  AdminTradeSearchRequest,
} from '@/features/admin/model/tradeTypes'
import { mockTradeRepository } from '@/mocks/tradeRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

function toSearchParams(request: AdminTradeSearchRequest) {
  const params = new URLSearchParams({ size: String(request.size ?? 20) })
  if (request.status) params.set('status', request.status)
  if (request.userId !== null) params.set('userId', String(request.userId))
  if (request.cursor) params.set('cursor', request.cursor)
  return params
}

export const adminTradesApi = {
  async getTrades(request: AdminTradeSearchRequest): Promise<AdminTradePage> {
    if (useMocks) return mockTradeRepository.getAdminTrades(request)
    return apiRequest<AdminTradePage>(
      `/admin/trades?${toSearchParams(request)}`,
    )
  },
}
