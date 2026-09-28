import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { adminOperationsApi } from '@/features/admin/api/adminOperationsApi'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'

export function AdminNoticesPage() {
  const client = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const list = useInfiniteQuery({
    queryKey: ['admin', 'notices'], initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminOperationsApi.notices(pageParam),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
  })
  const detail = useQuery({ queryKey: ['admin', 'notices', selectedId], queryFn: () => adminOperationsApi.notice(selectedId!), enabled: selectedId !== null })
  const save = useMutation({
    mutationFn: () => editing && selectedId !== null
      ? adminOperationsApi.updateNotice(selectedId, title, content, isPinned)
      : adminOperationsApi.createNotice(title, content, isPinned),
    onSuccess: async () => { setSelectedId(null); setEditing(false); setTitle(''); setContent(''); setIsPinned(false); await client.invalidateQueries({ queryKey: ['admin', 'notices'] }); await client.invalidateQueries({ queryKey: ['notices'] }) },
  })
  const remove = useMutation({
    mutationFn: (noticeId: number) => adminOperationsApi.deleteNotice(noticeId),
    onSuccess: async () => { setConfirmDeleteId(null); setSelectedId(null); await client.invalidateQueries({ queryKey: ['admin', 'notices'] }); await client.invalidateQueries({ queryKey: ['notices'] }) },
  })
  const notices = list.data?.pages.flatMap((page) => page.items) ?? []
  function select(noticeId: number) { setSelectedId(noticeId); setEditing(false); save.reset() }
  function beginEdit() { if (!detail.data) return; setTitle(detail.data.title); setContent(detail.data.content); setIsPinned(detail.data.isPinned); setEditing(true) }
  function beginCreate() { setSelectedId(null); setEditing(true); setTitle(''); setContent(''); setIsPinned(false); save.reset() }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!title.trim() || !content.trim()) return; save.mutate() }
  return <section className="admin-notices-page">
    <div className="admin-page-heading"><div><span><Megaphone size={16} aria-hidden="true" /> 공지 운영</span><h1>공지사항 관리</h1><p>공지 작성·수정·삭제 및 공개 상태를 관리합니다.</p></div><button className="button button--primary" type="button" onClick={beginCreate}>새 공지</button></div>
    {list.isLoading && <LoadingState label="공지를 불러오는 중" />}
    {list.isError && <ErrorState title="공지를 불러오지 못했어요" retry={() => void list.refetch()} />}
    {list.isSuccess && notices.length === 0 && <EmptyState title="등록된 공지가 없습니다" description="새 공지를 등록해 주세요." />}
    {notices.length > 0 && <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">공지 목록</caption><thead><tr><th>ID</th><th>제목</th><th>고정</th><th>등록일</th><th>관리</th></tr></thead><tbody>{notices.map((notice) => <tr key={notice.noticeId}>
      <td>#{notice.noticeId}</td><td><button type="button" onClick={() => select(notice.noticeId)}>{notice.title}</button></td><td>{notice.isPinned ? '고정' : '일반'}</td><td>{new Date(notice.createdAt).toLocaleDateString('ko-KR')}</td><td><button type="button" onClick={() => select(notice.noticeId)}>상세</button> <button type="button" onClick={() => setConfirmDeleteId(notice.noticeId)}>삭제</button></td>
    </tr>)}</tbody></table></div></div>}
    {list.hasNextPage && <button className="load-more" type="button" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>더 보기</button>}
    {selectedId !== null && !editing && <div className="admin-filter-card" aria-label="공지 상세">
      {detail.isLoading && <LoadingState label="공지 상세를 불러오는 중" />}
      {detail.isError && <ErrorState title="공지 상세를 불러오지 못했어요" retry={() => void detail.refetch()} />}
      {detail.data && <><h2>{detail.data.title}</h2><p style={{ whiteSpace: 'pre-wrap' }}>{detail.data.content}</p><button className="button button--primary" type="button" onClick={beginEdit}>수정</button> <button className="button button--secondary" type="button" onClick={() => setSelectedId(null)}>닫기</button></>}
    </div>}
    {editing && <div className="admin-filter-card"><form onSubmit={submit}>
      <h2>{selectedId === null ? '공지 작성' : '공지 수정'}</h2>
      <label>제목<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>내용<textarea required maxLength={5000} rows={8} value={content} onChange={(event) => setContent(event.target.value)} /></label>
      <label><input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} /> 상단 고정</label>
      {save.isError && <p className="field-error" role="alert">{save.error.message}</p>}
      <button className="button button--primary" disabled={save.isPending} type="submit">저장</button> <button className="button button--secondary" disabled={save.isPending} type="button" onClick={() => { setEditing(false); setSelectedId(null) }}>취소</button>
    </form></div>}
    {confirmDeleteId !== null && <div className="admin-filter-card" role="dialog" aria-modal="false" aria-label="공지 삭제 확인"><p>공지 #{confirmDeleteId}을 삭제할까요?</p>
      {remove.isError && <p className="field-error" role="alert">{remove.error.message}</p>}
      <button className="button button--primary" disabled={remove.isPending} type="button" onClick={() => remove.mutate(confirmDeleteId)}>삭제</button> <button className="button button--secondary" type="button" onClick={() => setConfirmDeleteId(null)}>취소</button>
    </div>}
  </section>
}
