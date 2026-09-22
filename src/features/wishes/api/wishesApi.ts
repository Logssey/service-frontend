import type { WishPage, WishResponse } from '@/features/wishes/model/types'
import { mockListingRepository } from '@/mocks/listingRepository'
import { apiRequest } from '@/shared/api/http'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

export const wishesApi = {
  async getWishes(cursor?: string | null, size = 20): Promise<WishPage> {
    if (useMocks) return mockListingRepository.getWishes(cursor, size)

    const params = new URLSearchParams({ size: String(size) })
    if (cursor) params.set('cursor', cursor)
    return apiRequest<WishPage>(`/wishes?${params}`)
  },

  async setWish(listingId: number, wished: boolean): Promise<WishResponse> {
    if (useMocks) return mockListingRepository.setWish(listingId, wished)
    return apiRequest<WishResponse>(`/listings/${listingId}/wish`, {
      method: wished ? 'POST' : 'DELETE',
    })
  },
}
