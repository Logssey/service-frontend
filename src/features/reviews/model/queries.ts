import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewsApi } from '@/features/reviews/api/reviewsApi'
import type { ReviewCreateRequest } from '@/features/reviews/model/types'
import { tradeKeys } from '@/features/trades/model/queries'
import type { TradeDetailResponse } from '@/features/trades/model/types'

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ReviewCreateRequest) => reviewsApi.createReview(request),
    onSuccess: async (_response, request) => {
      queryClient.setQueryData<TradeDetailResponse>(
        tradeKeys.detail(request.tradeId),
        (trade) => (trade ? { ...trade, reviewWritten: true } : trade),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tradeKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: tradeKeys.detail(request.tradeId),
        }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ])
    },
  })
}
