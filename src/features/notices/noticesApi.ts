import { apiRequest } from '@/shared/api/http'
import type { CursorPageResponse } from '@/shared/model/api'

export interface NoticeSummary {
  noticeId: number
  title: string
  isPinned: boolean
  createdAt: string
}

export interface Notice extends NoticeSummary {
  content: string
  updatedAt: string | null
}

export const noticesApi = {
  list(cursor: string | null) {
    const params = new URLSearchParams({ size: '20' })
    if (cursor) params.set('cursor', cursor)
    return apiRequest<CursorPageResponse<NoticeSummary>>(`/notices?${params}`)
  },
  detail: (noticeId: number) => apiRequest<Notice>(`/notices/${noticeId}`),
}
