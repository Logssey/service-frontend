import { useInfiniteQuery } from '@tanstack/react-query'
import { meApi } from '@/features/me/api/meApi'
import type { MyListingStatusFilter } from '@/features/me/model/types'

export const meKeys = {
  all: ['me'] as const,
  selling: () => [...meKeys.all, 'selling'] as const,
  sellingList: (status: MyListingStatusFilter | null) =>
    [...meKeys.selling(), status] as const,
  reviews: () => [...meKeys.all, 'reviews'] as const,
}

export function useMySellingListings(
  status: MyListingStatusFilter | null,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: meKeys.sellingList(status),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      meApi.getMySellingListings({ status, cursor: pageParam, size: 8 }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    enabled,
  })
}

export function useMyReceivedReviews(enabled = true) {
  return useInfiniteQuery({
    queryKey: meKeys.reviews(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => meApi.getReceivedReviews(pageParam, 8),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    enabled,
  })
}
