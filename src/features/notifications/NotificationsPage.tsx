import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { notificationsApi, notificationTargetPath } from '@/features/notifications/api/notificationsApi'
import type { NotificationSettings } from '@/features/notifications/api/notificationsApi'
import { ApiClientError } from '@/shared/api/http'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import { useToastStore } from '@/shared/state/toastStore'
import { useState } from 'react'

const settingsLabels: Record<keyof NotificationSettings, string> = {
  tradeEnabled: '거래',
  chatEnabled: '채팅',
  reviewEnabled: '후기',
  reportEnabled: '신고 처리',
  noticeEnabled: '공지',
}

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const showToast = useToastStore((state) => state.show)
  const queryClient = useQueryClient()
  const key = ['notifications', 'list', unreadOnly] as const
  const list = useInfiniteQuery({
    queryKey: key,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => notificationsApi.list(unreadOnly, pageParam),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
    retry: false,
  })
  const settings = useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: notificationsApi.settings,
    enabled: list.isSuccess,
  })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: refresh,
    onError: () => showToast('알림을 읽음 처리하지 못했습니다.'),
  })
  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: refresh,
    onError: () => showToast('알림을 읽음 처리하지 못했습니다.'),
  })
  const updateSettings = useMutation({
    mutationFn: notificationsApi.updateSettings,
    onSuccess: refresh,
    onError: () => showToast('알림 설정을 저장하지 못했습니다.'),
  })
  const items = list.data?.pages.flatMap((page) => page.items) ?? []
  const unauthenticated = list.error instanceof ApiClientError && list.error.status === 401

  return (
    <div className="app-page collection-page">
      <PageHeader title="알림" action={list.isSuccess ? (
        <button className="text-action" type="button" disabled={markAll.isPending}
          onClick={() => markAll.mutate()}>모두 읽음</button>
      ) : null} />
      <main className="content-shell collection-content">
        {unauthenticated ? (
          <EmptyState title="로그인이 필요합니다" description="로그인 후 알림을 확인할 수 있어요."
            action={<Link className="button button--primary" to="/login">로그인</Link>} />
        ) : (
          <>
            <div className="section-toolbar">
              <h2>내 알림</h2>
              <label><input type="checkbox" checked={unreadOnly}
                onChange={(event) => setUnreadOnly(event.target.checked)} /> 읽지 않은 알림만</label>
            </div>
            {list.isLoading ? <LoadingState label="알림을 불러오는 중" /> : null}
            {list.isError && !unauthenticated ? <ErrorState title="알림을 불러오지 못했어요" retry={() => void list.refetch()} /> : null}
            {list.isSuccess && items.length === 0 ? (
              <EmptyState title="알림이 없습니다" description="새 알림이 오면 이곳에 표시됩니다." />
            ) : null}
            <div className="notification-list">
              {items.map((item) => {
                const target = notificationTargetPath(item)
                return (
                  <article className={`notification-card${item.readAt ? '' : ' is-unread'}`} key={item.notificationId}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                      <small>{new Date(item.createdAt).toLocaleString('ko-KR')}</small>
                    </div>
                    <div className="notification-card__actions">
                      {target ? <Link to={target} onClick={() => {
                        if (!item.readAt) markRead.mutate(item.notificationId)
                      }}>상세 보기</Link> : null}
                      {!item.readAt ? <button type="button" disabled={markRead.isPending}
                        onClick={() => markRead.mutate(item.notificationId)}>읽음</button> : null}
                    </div>
                  </article>
                )
              })}
            </div>
            {list.hasNextPage ? <button className="load-more" type="button"
              disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
              {list.isFetchingNextPage ? '불러오는 중…' : '알림 더 보기'}
            </button> : null}
            <section aria-labelledby="notification-settings-heading">
              <h2 id="notification-settings-heading">알림 설정</h2>
              {settings.isError ? <ErrorState title="설정을 불러오지 못했어요"
                retry={() => void settings.refetch()} /> : null}
              {settings.data ? (Object.keys(settingsLabels) as (keyof NotificationSettings)[]).map((field) => (
                <label className="notification-setting" key={field}>
                  <span>{settingsLabels[field]}</span>
                  <input type="checkbox" checked={settings.data[field]} disabled={updateSettings.isPending}
                    onChange={(event) => updateSettings.mutate({ [field]: event.target.checked })} />
                </label>
              )) : null}
            </section>
          </>
        )}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
