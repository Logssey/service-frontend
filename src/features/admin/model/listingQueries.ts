import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminListingsApi } from '@/features/admin/api/adminListingsApi'
import type {
  AdminListingSearchRequest,
  AdminListingStatusAction,
} from '@/features/admin/model/types'
import { listingKeys } from '@/features/listings/model/queries'

type AdminListingFilters = Pick<
  AdminListingSearchRequest,
  'status' | 'keyword' | 'sellerId'
>

export const adminKeys = {
  all: ['admin'] as const,
  listings: () => [...adminKeys.all, 'listings'] as const,
  listingList: (filters: AdminListingFilters) =>
    [...adminKeys.listings(), filters] as const,
}

export function useAdminListings(filters: AdminListingFilters) {
  return useInfiniteQuery({
    queryKey: adminKeys.listingList(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      adminListingsApi.getListings({
        ...filters,
        cursor: pageParam,
        size: 10,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  })
}

async function invalidateListingViews(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminKeys.listings() }),
    queryClient.invalidateQueries({ queryKey: listingKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['wishes'] }),
    queryClient.invalidateQueries({ queryKey: ['me'] }),
  ])
}

export function useChangeAdminListingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      listingId,
      status,
      reason,
    }: {
      listingId: number
      status: AdminListingStatusAction
      reason: string
    }) => adminListingsApi.changeStatus(listingId, { status, reason }),
    onSuccess: () => invalidateListingViews(queryClient),
  })
}

export function useDeleteAdminListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listingId, reason }: { listingId: number; reason: string }) =>
      adminListingsApi.deleteListing(listingId, { reason }),
    onSuccess: () => invalidateListingViews(queryClient),
  })
}
