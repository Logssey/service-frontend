import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportsApi } from '@/features/reports/api/reportsApi'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import '@/features/reports/reportFlows.css'

export function MyReportsPage() {
  const query = useInfiniteQuery({
    queryKey: ['reports', 'me'], initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => reportsApi.myReports(pageParam),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
  })
  const reports = query.data?.pages.flatMap((page) => page.items) ?? []
  return <div className="app-page collection-page">
    <PageHeader title="내 신고 내역" />
    <main className="content-shell">
      {query.isLoading && <LoadingState label="신고 내역을 불러오는 중" />}
      {query.isError && <ErrorState title="신고 내역을 불러오지 못했어요" retry={() => void query.refetch()} />}
      {query.isSuccess && reports.length === 0 && <EmptyState title="접수한 신고가 없습니다" description="신고 접수 후 이곳에서 처리 상태를 확인할 수 있습니다." />}
      <div className="admin-table-card"><ul>
        {reports.map((report) => <li key={report.reportId}>
          <strong>#{report.reportId} · {report.targetType} #{report.targetId}</strong>
          <p>{report.reasonCode} · {report.status} · {new Date(report.createdAt).toLocaleString('ko-KR')}</p>
          {report.resolution && <p>처리 결과: {report.resolution}</p>}
        </li>)}
      </ul></div>
      {query.hasNextPage && <button className="load-more" type="button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>더 보기</button>}
      <Link to="/me">내 정보로</Link>
    </main><MobileBottomNavigation />
  </div>
}
