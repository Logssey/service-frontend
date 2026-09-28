import { describe, expect, it } from 'vitest'
import { notificationTargetPath } from '@/features/notifications/api/notificationsApi'
import type { Notification } from '@/features/notifications/api/notificationsApi'

const example: Notification = {
  notificationId: 1,
  type: 'TRADE_REQUESTED',
  title: '새 거래 요청',
  body: '내용',
  targetType: 'TRADE',
  targetId: 12,
  readAt: null,
  createdAt: '2026-09-28T00:00:00Z',
}

describe('notificationTargetPath', () => {
  it.each([
    ['TRADE', 12, '/trades/12'],
    ['CHAT_ROOM', 12, '/chat/12'],
    ['LISTING', 12, '/listings/12'],
    ['NOTICE', 12, '/notices/12'],
    ['REPORT', 12, '/reports/me'],
    ['REVIEW', 12, '/me'],
  ])('maps %s notifications to a real page', (targetType, targetId, path) => {
    expect(notificationTargetPath({ ...example, targetType, targetId })).toBe(path)
  })

  it('does not invent a route for an unknown or missing target', () => {
    expect(notificationTargetPath({ ...example, targetId: null })).toBeNull()
    expect(notificationTargetPath({ ...example, targetType: 'UNKNOWN' })).toBeNull()
  })
})
