import { apiRequest } from '@/shared/api/http'
import type { CursorPageResponse } from '@/shared/model/api'
import type { ReportStatus, ReportTargetType } from '@/features/admin/model/operationsTypes'

export type ReportReasonCode = 'PROHIBITED_ITEM' | 'FALSE_INFO' | 'NO_SHOW' | 'SEXUAL_CONTENT' | 'FRAUD_SUSPICION' | 'ABUSIVE_BEHAVIOR' | 'SPAM' | 'OTHER'
export interface MyReportResponse {
  reportId: number
  targetType: ReportTargetType
  targetId: number
  reasonCode: ReportReasonCode
  status: ReportStatus
  resolution: string | null
  createdAt: string
  handledAt: string | null
}

export const reportReasonLabels: Record<ReportReasonCode, string> = {
  PROHIBITED_ITEM: '금지 품목', FALSE_INFO: '허위 정보', NO_SHOW: '약속 불이행',
  SEXUAL_CONTENT: '음란성 내용', FRAUD_SUSPICION: '사기 의심',
  ABUSIVE_BEHAVIOR: '욕설·비방', SPAM: '광고·도배', OTHER: '기타',
}

export const allowedReportReasons: Record<ReportTargetType, ReportReasonCode[]> = {
  LISTING: ['PROHIBITED_ITEM', 'FALSE_INFO', 'FRAUD_SUSPICION', 'SPAM', 'OTHER'],
  USER: ['FRAUD_SUSPICION', 'ABUSIVE_BEHAVIOR', 'NO_SHOW', 'OTHER'],
  MESSAGE: ['ABUSIVE_BEHAVIOR', 'SEXUAL_CONTENT', 'SPAM', 'OTHER'],
  COMMUNITY_POST: ['FALSE_INFO', 'ABUSIVE_BEHAVIOR', 'SEXUAL_CONTENT', 'SPAM', 'OTHER'],
  COMMUNITY_COMMENT: ['ABUSIVE_BEHAVIOR', 'SEXUAL_CONTENT', 'SPAM', 'OTHER'],
}

export const reportsApi = {
  create: (targetType: ReportTargetType, targetId: number, reasonCode: ReportReasonCode, detail?: string) =>
    apiRequest<{ reportId: number }>('/reports', {
      method: 'POST', body: JSON.stringify({ targetType, targetId, reasonCode, detail: detail?.trim() || undefined }),
    }),
  myReports: (cursor?: string | null) => {
    const params = new URLSearchParams({ size: '20' })
    if (cursor) params.set('cursor', cursor)
    return apiRequest<CursorPageResponse<MyReportResponse>>(`/reports/me?${params}`)
  },
}
