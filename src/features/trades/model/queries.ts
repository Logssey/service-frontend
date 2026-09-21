import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listingKeys } from '@/features/listings/model/queries'
import { tradesApi } from '@/features/trades/api/tradesApi'
import type {
  TradeAction,
  TradeRoleFilter,
  TradeStatus,
} from '@/features/trades/model/types'

export const tradeKeys = {
  all: ['trades'] as const,
  lists: () => [...tradeKeys.all, 'list'] as const,
  list: (role: TradeRoleFilter, status: TradeStatus | null) =>
    [...tradeKeys.lists(), role, status] as const,
  detail: (tradeId: number) => [...tradeKeys.all, 'detail', tradeId] as const,
}

export function useTrades(role: TradeRoleFilter, status: TradeStatus | null) {
  return useInfiniteQuery({
    queryKey: tradeKeys.list(role, status),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      tradesApi.getTrades({ role, status, cursor: pageParam, size: 10 }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  })
}

export function useTrade(tradeId: number) {
  return useQuery({
    queryKey: tradeKeys.detail(tradeId),
    queryFn: () => tradesApi.getTrade(tradeId),
    enabled: Number.isFinite(tradeId),
  })
}

export function useCreateTrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (listingId: number) => tradesApi.createTrade({ listingId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tradeKeys.all })
    },
  })
}

export function useChangeTradeStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      tradeId,
      action,
      reason,
    }: {
      tradeId: number
      action: TradeAction
      reason?: string
    }) => tradesApi.changeStatus(tradeId, action, { reason }),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: tradeKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: tradeKeys.detail(variables.tradeId),
      })
      void queryClient.invalidateQueries({ queryKey: listingKeys.all })
    },
  })
}
