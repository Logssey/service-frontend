import { apiRequest } from '@/shared/api/http'
import type {
  AdminAuditPage,
  AdminDashboardResponse,
  AdminNoticePage,
  AdminReportPage,
  AdminUserPage,
  ChatbotFeatureStatusResponse,
  CredentialStatusResponse,
  NoticeResponse,
  ReportAction,
  ReportStatus,
  ReportTargetType,
} from '@/features/admin/model/operationsTypes'

function searchParams(fields: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export const adminOperationsApi = {
  dashboard: () => apiRequest<AdminDashboardResponse>('/admin/dashboard'),
  chatbot: () => apiRequest<ChatbotFeatureStatusResponse>('/admin/chatbot'),
  credentialStatus: () => apiRequest<CredentialStatusResponse>('/admin/credentials/status'),
  updateChatbot: (enabled: boolean) => apiRequest<ChatbotFeatureStatusResponse>('/admin/chatbot', {
    method: 'PATCH', body: JSON.stringify({ enabled }),
  }),
  users: (filters: { status?: string; keyword?: string; cursor?: string | null; size?: number }) =>
    apiRequest<AdminUserPage>(`/admin/users?${searchParams(filters)}`),
  updateUserRole: (userId: number, role: 'USER' | 'ADMIN', reason: string) =>
    apiRequest<void>(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role, reason }) }),
  updateUserStatus: (userId: number, status: 'ACTIVE' | 'SUSPENDED', reason: string, suspendedUntil?: string) =>
    apiRequest<void>(`/admin/users/${userId}/status`, {
      method: 'PATCH', body: JSON.stringify({ status, reason, ...(suspendedUntil ? { suspendedUntil } : {}) }),
    }),
  reports: (filters: { status?: ReportStatus; targetType?: ReportTargetType; cursor?: string | null; size?: number }) =>
    apiRequest<AdminReportPage>(`/admin/reports?${searchParams(filters)}`),
  handleReport: (reportId: number, status: Exclude<ReportStatus, 'RECEIVED'>, resolution?: string, action: ReportAction = 'NONE') =>
    apiRequest<void>(`/admin/reports/${reportId}`, {
      method: 'PATCH', body: JSON.stringify({ status, resolution, action }),
    }),
  notices: (cursor?: string | null) =>
    apiRequest<AdminNoticePage>(`/notices?${searchParams({ cursor, size: 20 })}`),
  notice: (noticeId: number) => apiRequest<NoticeResponse>(`/notices/${noticeId}`),
  createNotice: (title: string, content: string, isPinned: boolean) =>
    apiRequest<void>('/admin/notices', { method: 'POST', body: JSON.stringify({ title, content, isPinned }) }),
  updateNotice: (noticeId: number, title: string, content: string, isPinned: boolean) =>
    apiRequest<void>(`/admin/notices/${noticeId}`, { method: 'PATCH', body: JSON.stringify({ title, content, isPinned }) }),
  deleteNotice: (noticeId: number) => apiRequest<void>(`/admin/notices/${noticeId}`, { method: 'DELETE' }),
  auditLogs: (filters: { action?: string; actorId?: number; from?: string; to?: string; cursor?: string | null; size?: number }) =>
    apiRequest<AdminAuditPage>(`/admin/audit-logs?${searchParams(filters)}`),
}
