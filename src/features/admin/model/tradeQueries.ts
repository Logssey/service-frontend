import { useInfiniteQuery } from '@tanstack/react-query'
import { adminTradesApi } from '@/features/admin/api/adminTradesApi'
import type { AdminTradeSearchRequest } from '@/features/admin/model/tradeTypes'

type AdminTradeFilters = Pick<AdminTradeSearchRequest, 'status' | 'userId'>

export const adminTradeKeys = {
  all: ['admin', 'trades'] as const,
  list: (filters: AdminTradeFilters) =>
    [...adminTradeKeys.all, filters] as const,
}

export function useAdminTrades(filters: AdminTradeFilters) {
  return useInfiniteQuery({
    queryKey: adminTradeKeys.list(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      adminTradesApi.getTrades({
        ...filters,
        cursor: pageParam,
        size: 10,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  })
}
