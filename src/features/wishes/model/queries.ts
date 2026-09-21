import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listingKeys } from '@/features/listings/model/queries'
import type { ListingDetailResponse } from '@/features/listings/model/types'
import { wishesApi } from '@/features/wishes/api/wishesApi'

export const wishKeys = {
  all: ['wishes'] as const,
  list: () => [...wishKeys.all, 'list'] as const,
}

export function useWishes() {
  return useInfiniteQuery({
    queryKey: wishKeys.list(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => wishesApi.getWishes(pageParam, 12),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  })
}

export function useSetWish() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listingId, wished }: { listingId: number; wished: boolean }) =>
      wishesApi.setWish(listingId, wished),
    onSuccess: (response, variables) => {
      queryClient.setQueryData<ListingDetailResponse>(
        listingKeys.detail(variables.listingId),
        (current) =>
          current
            ? {
                ...current,
                isWished: response.wished,
                wishCount: response.wishCount,
              }
            : current,
      )
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: wishKeys.all })
      void queryClient.invalidateQueries({ queryKey: listingKeys.all })
      void queryClient.invalidateQueries({
        queryKey: listingKeys.detail(variables.listingId),
      })
    },
  })
}
