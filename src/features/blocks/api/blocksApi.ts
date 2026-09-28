import { apiRequest } from '@/shared/api/http'
import type { CursorPageResponse } from '@/shared/model/api'
import type { UserSummaryResponse } from '@/features/listings/model/types'

export interface BlockResponse {
  blockId: number
  blockedUser: UserSummaryResponse
  createdAt: string
}

export const blocksApi = {
  create: (userId: number) => apiRequest<{ blockId: number; blocked: boolean }>('/blocks', {
    method: 'POST', body: JSON.stringify({ userId }),
  }),
  remove: (userId: number) => apiRequest<void>(`/blocks/${userId}`, { method: 'DELETE' }),
  list: (cursor?: string | null) => {
    const params = new URLSearchParams({ size: '20' })
    if (cursor) params.set('cursor', cursor)
    return apiRequest<CursorPageResponse<BlockResponse>>(`/blocks?${params}`)
  },
}
