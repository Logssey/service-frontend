import { useInfiniteQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { adminOperationsApi } from '@/features/admin/api/adminOperationsApi'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'

interface Filters { action: string; actorId: number | undefined; from: string; to: string }
const empty: Filters = { action: '', actorId: undefined, from: '', to: '' }

export function AdminAuditLogsPage() {
  const [draftAction, setDraftAction] = useState('')
  const [draftActorId, setDraftActorId] = useState('')
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [filters, setFilters] = useState<Filters>(empty)
  const [validationError, setValidationError] = useState('')
  const query = useInfiniteQuery({
    queryKey: ['admin', 'audit-logs', filters], initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminOperationsApi.auditLogs({
      action: filters.action || undefined, actorId: filters.actorId,
      from: filters.from || undefined, to: filters.to || undefined, cursor: pageParam, size: 20,
    }),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
  })
  const logs = query.data?.pages.flatMap((page) => page.items) ?? []
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const actorId = draftActorId.trim() ? Number(draftActorId) : undefined
    if (actorId !== undefined && (!Number.isSafeInteger(actorId) || actorId <= 0)) { setValidationError('행위자 ID는 양의 정수여야 합니다.'); return }
    const from = draftFrom ? new Date(draftFrom).toISOString() : ''
    const to = draftTo ? new Date(draftTo).toISOString() : ''
    if (from && to && from > to) { setValidationError('시작 시각이 종료 시각보다 늦습니다.'); return }
    setValidationError('')
    setFilters({ action: draftAction.trim(), actorId, from, to })
  }
  return <section className="admin-audit-page">
    <div className="admin-page-heading"><div><span><FileText size={16} aria-hidden="true" /> 운영 기록</span><h1>감사 로그</h1><p>관리자 조치 이력을 조회합니다.</p></div><small>READ ONLY</small></div>
    <div className="admin-filter-card"><form className="admin-search-form" onSubmit={search}>
      <label>행위 <input placeholder="예: REPORT_HANDLE" value={draftAction} onChange={(event) => setDraftAction(event.target.value)} /></label>
      <label>행위자 ID <input inputMode="numeric" value={draftActorId} onChange={(event) => setDraftActorId(event.target.value)} /></label>
      <label>시작 <input type="datetime-local" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} /></label>
      <label>종료 <input type="datetime-local" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} /></label>
      <button className="button button--primary" type="submit">조회</button>
    </form>{validationError && <p className="field-error" role="alert">{validationError}</p>}</div>
    {query.isLoading && <LoadingState label="감사 로그를 불러오는 중" />}
    {query.isError && <ErrorState title="감사 로그를 불러오지 못했어요" retry={() => void query.refetch()} />}
    {query.isSuccess && logs.length === 0 && <EmptyState title="조건에 맞는 기록이 없습니다" description="기간이나 검색 조건을 바꿔 확인해 주세요." />}
    {logs.length > 0 && <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">감사 로그</caption><thead><tr><th>ID</th><th>행위자</th><th>행위</th><th>대상</th><th>결과</th><th>시각</th></tr></thead><tbody>{logs.map((log) => <tr key={log.auditLogId}>
      <td>#{log.auditLogId}</td><td>{log.actor?.nickname ?? '시스템'}</td><td>{log.action}</td><td>{log.targetType ? `${log.targetType} #${log.targetId}` : '—'}</td><td>{log.result}</td><td>{new Date(log.createdAt).toLocaleString('ko-KR')}</td>
    </tr>)}</tbody></table></div></div>}
    {query.hasNextPage && <button className="load-more" type="button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>더 보기</button>}
  </section>
}
