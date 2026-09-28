import type { CursorPageResponse } from '@/shared/model/api'
import type { UserSummaryResponse } from '@/features/listings/model/types'

export interface AdminDashboardResponse {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  totalListings: number
  onSaleListings: number
  completedTrades: number
  pendingReports: number
}

export interface ChatbotFeatureStatusResponse {
  enabled: boolean
  adminEnabled: boolean
  environmentEnabled: boolean
  freeInputEnabled: boolean
}

export interface CredentialStatusResponse {
  credentials: Array<{
    service: 'JWT' | 'DATABASE' | 'REDIS' | 'SMTP' | 'KAKAO_OAUTH' | 'IMAGE_STORAGE' | 'LLM'
    configured: boolean
    enabled: boolean
    source: 'APPLICATION_CONFIGURATION' | 'DEFAULT_PROVIDER_CHAIN'
  }>
}

export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN'
export interface AdminUserResponse {
  userId: number
  nickname: string
  role: 'USER' | 'ADMIN'
  status: AdminUserStatus
  suspendedUntil: string | null
  listingCount: number
  reportedCount: number
  createdAt: string
}

export type ReportTargetType = 'LISTING' | 'USER' | 'MESSAGE' | 'COMMUNITY_POST' | 'COMMUNITY_COMMENT'
export type ReportStatus = 'RECEIVED' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED'
export type ReportAction = 'NONE' | 'HIDE_LISTING' | 'DELETE_LISTING' | 'HIDE_COMMUNITY_POST' | 'HIDE_COMMUNITY_COMMENT' | 'SUSPEND_USER'
export interface AdminReportResponse {
  reportId: number
  reporter: UserSummaryResponse
  targetType: ReportTargetType
  targetId: number
  targetSummary: string | null
  reasonCode: string
  detail: string | null
  status: ReportStatus
  handledBy: number | null
  resolution: string | null
  createdAt: string
}

export interface NoticeSummaryResponse {
  noticeId: number
  title: string
  isPinned: boolean
  createdAt: string
}
export interface NoticeResponse extends NoticeSummaryResponse {
  content: string
  updatedAt: string | null
}
export interface AuditLogResponse {
  auditLogId: number
  actor: UserSummaryResponse | null
  action: string
  targetType: string | null
  targetId: number | null
  result: string
  createdAt: string
}

export type AdminUserPage = CursorPageResponse<AdminUserResponse>
export type AdminReportPage = CursorPageResponse<AdminReportResponse>
export type AdminNoticePage = CursorPageResponse<NoticeSummaryResponse>
export type AdminAuditPage = CursorPageResponse<AuditLogResponse>
