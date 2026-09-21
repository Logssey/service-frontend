import type {
  AdminDeleteRequest,
  AdminListingPage,
  AdminListingSearchRequest,
  AdminListingStatusRequest,
  AdminListingStatusResponse,
} from '@/features/admin/model/types'
import { mockListingRepository } from '@/mocks/listingRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

function toSearchParams(request: AdminListingSearchRequest) {
  const params = new URLSearchParams({ size: String(request.size ?? 20) })
  const keyword = request.keyword.trim()
  if (request.status) params.set('status', request.status)
  if (keyword) params.set('keyword', keyword)
  if (request.sellerId !== null) {
    params.set('sellerId', String(request.sellerId))
  }
  if (request.cursor) params.set('cursor', request.cursor)
  return params
}

export const adminListingsApi = {
  async getListings(
    request: AdminListingSearchRequest,
  ): Promise<AdminListingPage> {
    if (useMocks) return mockListingRepository.getAdminListings(request)
    return apiRequest<AdminListingPage>(
      `/admin/listings?${toSearchParams(request)}`,
    )
  },

  async changeStatus(
    listingId: number,
    request: AdminListingStatusRequest,
  ): Promise<AdminListingStatusResponse> {
    if (useMocks) {
      return mockListingRepository.changeAdminListingStatus(listingId, request)
    }
    return apiRequest<AdminListingStatusResponse>(
      `/admin/listings/${listingId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(request),
      },
    )
  },

  async deleteListing(
    listingId: number,
    request: AdminDeleteRequest,
  ): Promise<void> {
    if (useMocks) {
      return mockListingRepository.deleteListingAsAdmin(listingId, request)
    }
    return apiRequest<void>(`/admin/listings/${listingId}`, {
      method: 'DELETE',
      body: JSON.stringify(request),
    })
  },
}
