import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { noticesApi } from '@/features/notices/noticesApi'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'

export function NoticesPage() {
  const notices = useInfiniteQuery({
    queryKey: ['notices'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => noticesApi.list(pageParam),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
  })
  const items = notices.data?.pages.flatMap((page) => page.items) ?? []
  return (
    <div className="app-page collection-page">
      <PageHeader title="공지사항" />
      <main className="content-shell collection-content">
        {notices.isLoading ? <LoadingState label="공지를 불러오는 중" /> : null}
        {notices.isError ? <ErrorState title="공지를 불러오지 못했어요"
          retry={() => void notices.refetch()} /> : null}
        {notices.isSuccess && items.length === 0 ? (
          <EmptyState title="등록된 공지가 없습니다" description="새 공지가 등록되면 이곳에서 확인할 수 있어요." />
        ) : null}
        <div className="notice-list">
          {items.map((notice) => (
            <Link className="notice-card" to={`/notices/${notice.noticeId}`} key={notice.noticeId}>
              <strong>{notice.isPinned ? '📌 ' : ''}{notice.title}</strong>
              <small>{new Date(notice.createdAt).toLocaleDateString('ko-KR')}</small>
            </Link>
          ))}
        </div>
        {notices.hasNextPage ? <button className="load-more" type="button"
          disabled={notices.isFetchingNextPage} onClick={() => void notices.fetchNextPage()}>
          {notices.isFetchingNextPage ? '불러오는 중…' : '공지 더 보기'}
        </button> : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}

export function NoticeDetailPage() {
  const noticeId = Number(useParams().noticeId)
  const notice = useQuery({
    queryKey: ['notices', noticeId],
    queryFn: () => noticesApi.detail(noticeId),
    enabled: Number.isSafeInteger(noticeId) && noticeId > 0,
  })
  return (
    <div className="app-page detail-page">
      <PageHeader title="공지사항" />
      <main className="content-shell collection-content">
        {notice.isLoading ? <LoadingState label="공지를 불러오는 중" /> : null}
        {notice.isError ? <ErrorState title="공지를 불러오지 못했어요"
          retry={() => void notice.refetch()} /> : null}
        {notice.data ? <article className="notice-detail">
          <h1>{notice.data.title}</h1>
          <p>{new Date(notice.data.createdAt).toLocaleString('ko-KR')}</p>
          <div className="notice-detail__content">{notice.data.content}</div>
        </article> : null}
      </main>
      <MobileBottomNavigation />
    </div>
  )
}
