import { apiRequest } from '@/shared/api/http'
import type { CursorPageResponse } from '@/shared/model/api'

export interface Notification {
  notificationId: number
  type: string
  title: string
  body: string
  targetType: string | null
  targetId: number | null
  readAt: string | null
  createdAt: string
}

export interface NotificationSettings {
  tradeEnabled: boolean
  chatEnabled: boolean
  reviewEnabled: boolean
  reportEnabled: boolean
  noticeEnabled: boolean
}

export const notificationsApi = {
  list(unreadOnly: boolean, cursor: string | null) {
    const params = new URLSearchParams({ unreadOnly: String(unreadOnly), size: '20' })
    if (cursor) params.set('cursor', cursor)
    return apiRequest<CursorPageResponse<Notification>>(`/notifications?${params}`)
  },
  unreadCount: () => apiRequest<{ count: number }>('/notifications/unread-count'),
  markRead: (notificationId: number) =>
    apiRequest<void>(`/notifications/${notificationId}/read`, { method: 'POST' }),
  markAllRead: () =>
    apiRequest<{ readCount: number }>('/notifications/read-all', { method: 'POST' }),
  settings: () => apiRequest<NotificationSettings>('/notifications/settings'),
  updateSettings: (patch: Partial<NotificationSettings>) =>
    apiRequest<NotificationSettings>('/notifications/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
}

export function notificationTargetPath(notification: Notification): string | null {
  if (notification.targetId === null) return null
  switch (notification.targetType) {
    case 'TRADE': return `/trades/${notification.targetId}`
    case 'CHAT_ROOM': return `/chat/${notification.targetId}`
    case 'LISTING': return `/listings/${notification.targetId}`
    case 'NOTICE': return `/notices/${notification.targetId}`
    case 'REPORT': return '/reports/me'
    case 'REVIEW': return '/me'
    default: return null
  }
}
