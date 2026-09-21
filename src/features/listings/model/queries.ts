import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { listingsApi } from '@/features/listings/api/listingsApi'
import type { ListingFilters } from '@/features/listings/model/types'

export const listingKeys = {
  all: ['listings'] as const,
  categories: ['categories'] as const,
  list: (filters: ListingFilters) => [...listingKeys.all, 'list', filters] as const,
  detail: (listingId: number) =>
    [...listingKeys.all, 'detail', listingId] as const,
}

export function useCategories() {
  return useQuery({
    queryKey: listingKeys.categories,
    queryFn: listingsApi.getCategories,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useListings(filters: ListingFilters) {
  return useInfiniteQuery({
    queryKey: listingKeys.list(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      listingsApi.getListings({
        ...filters,
        cursor: pageParam,
        size: 8,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  })
}

export function useListing(listingId: number) {
  return useQuery({
    queryKey: listingKeys.detail(listingId),
    queryFn: () => listingsApi.getListing(listingId),
    enabled: Number.isFinite(listingId),
  })
}
