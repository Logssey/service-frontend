import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { adminOperationsApi } from '@/features/admin/api/adminOperationsApi'
import type { AdminReportResponse, ReportAction, ReportStatus, ReportTargetType } from '@/features/admin/model/operationsTypes'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'

const targets: ReportTargetType[] = ['LISTING', 'USER', 'MESSAGE', 'COMMUNITY_POST', 'COMMUNITY_COMMENT']
const actions: Record<ReportTargetType, ReportAction[]> = {
  LISTING: ['NONE', 'HIDE_LISTING', 'DELETE_LISTING', 'SUSPEND_USER'],
  USER: ['NONE', 'SUSPEND_USER'], MESSAGE: ['NONE', 'SUSPEND_USER'],
  COMMUNITY_POST: ['NONE', 'HIDE_COMMUNITY_POST', 'SUSPEND_USER'],
  COMMUNITY_COMMENT: ['NONE', 'HIDE_COMMUNITY_COMMENT', 'SUSPEND_USER'],
}
const statusLabels: Record<ReportStatus, string> = { RECEIVED: '접수', IN_REVIEW: '검토 중', RESOLVED: '처리 완료', REJECTED: '기각' }

export function AdminReportsPage() {
  const client = useQueryClient()
  const [status, setStatus] = useState<ReportStatus | ''>('')
  const [targetType, setTargetType] = useState<ReportTargetType | ''>('')
  const [selected, setSelected] = useState<AdminReportResponse | null>(null)
  const [nextStatus, setNextStatus] = useState<Exclude<ReportStatus, 'RECEIVED'>>('IN_REVIEW')
  const [resolution, setResolution] = useState('')
  const [action, setAction] = useState<ReportAction>('NONE')
  const query = useInfiniteQuery({
    queryKey: ['admin', 'reports', status, targetType], initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminOperationsApi.reports({ status: status || undefined, targetType: targetType || undefined, cursor: pageParam, size: 20 }),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
  })
  const handle = useMutation({
    mutationFn: () => adminOperationsApi.handleReport(selected!.reportId, nextStatus, nextStatus === 'IN_REVIEW' ? undefined : resolution.trim(), nextStatus === 'RESOLVED' ? action : 'NONE'),
    onSuccess: async () => { setSelected(null); setResolution(''); await client.invalidateQueries({ queryKey: ['admin'] }) },
  })
  const reports = query.data?.pages.flatMap((page) => page.items) ?? []
  function open(report: AdminReportResponse) { setSelected(report); setNextStatus(report.status === 'RECEIVED' ? 'IN_REVIEW' : 'RESOLVED'); setResolution(''); setAction('NONE'); handle.reset() }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (nextStatus !== 'IN_REVIEW' && !resolution.trim()) return; handle.mutate() }
  return <section className="admin-reports-page">
    <div className="admin-page-heading"><div><span><ShieldAlert size={16} aria-hidden="true" /> 신고 운영</span><h1>신고 관리</h1><p>접수된 신고를 검토하고 대상에 맞는 조치를 합니다.</p></div></div>
    <div className="admin-filter-card"><div className="admin-search-form"><label>상태 <select value={status} onChange={(event) => setStatus(event.target.value as ReportStatus | '')}><option value="">전체</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>대상 <select value={targetType} onChange={(event) => setTargetType(event.target.value as ReportTargetType | '')}><option value="">전체</option>{targets.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div></div>
    {query.isLoading && <LoadingState label="신고 목록을 불러오는 중" />}
    {query.isError && <ErrorState title="신고 목록을 불러오지 못했어요" retry={() => void query.refetch()} />}
    {query.isSuccess && reports.length === 0 && <EmptyState title="조건에 맞는 신고가 없습니다" description="상태나 대상 유형을 바꿔 확인해 주세요." />}
    {reports.length > 0 && <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">신고 목록</caption><thead><tr><th>ID</th><th>신고자</th><th>대상</th><th>사유·상세</th><th>상태</th><th>접수일</th><th>조치</th></tr></thead><tbody>{reports.map((report) => <tr key={report.reportId}>
      <td>#{report.reportId}</td><td>{report.reporter.nickname}</td><td>{report.targetType} #{report.targetId}<small>{report.targetSummary}</small></td><td>{report.reasonCode}{report.detail && <p>{report.detail}</p>}</td><td>{statusLabels[report.status]}{report.resolution && <small>{report.resolution}</small>}</td><td>{new Date(report.createdAt).toLocaleString('ko-KR')}</td><td>{report.status === 'RESOLVED' || report.status === 'REJECTED' ? '완료' : <button type="button" onClick={() => open(report)}>처리</button>}</td>
    </tr>)}</tbody></table></div></div>}
    {query.hasNextPage && <button className="load-more" type="button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>더 보기</button>}
    {selected && <div className="admin-filter-card" role="dialog" aria-modal="false" aria-label="신고 처리"><h2>신고 #{selected.reportId} 처리</h2><p>{selected.targetType} #{selected.targetId} · {selected.targetSummary}</p>
      <form onSubmit={submit}><label>처리 상태<select value={nextStatus} onChange={(event) => { setNextStatus(event.target.value as Exclude<ReportStatus, 'RECEIVED'>); setAction('NONE') }}>
        {selected.status === 'RECEIVED' && <option value="IN_REVIEW">검토 중</option>}<option value="RESOLVED">처리 완료</option><option value="REJECTED">기각</option>
      </select></label>
      {nextStatus !== 'IN_REVIEW' && <label>처리 내용<textarea required maxLength={500} value={resolution} onChange={(event) => setResolution(event.target.value)} /></label>}
      {nextStatus === 'RESOLVED' && <label>동시 조치<select value={action} onChange={(event) => setAction(event.target.value as ReportAction)}>{actions[selected.targetType].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
      {handle.isError && <p className="field-error" role="alert">{handle.error.message}</p>}
      <button className="button button--primary" type="submit" disabled={handle.isPending}>처리</button> <button className="button button--secondary" type="button" disabled={handle.isPending} onClick={() => setSelected(null)}>취소</button>
      </form>
    </div>}
  </section>
}
