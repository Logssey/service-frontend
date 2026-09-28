import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { adminOperationsApi } from '@/features/admin/api/adminOperationsApi'
import type { AdminUserResponse, AdminUserStatus } from '@/features/admin/model/operationsTypes'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'

type Action = 'SUSPEND' | 'ACTIVATE' | 'PROMOTE' | 'DEMOTE'
const labels: Record<Action, string> = { SUSPEND: '이용 정지', ACTIVATE: '정지 해제', PROMOTE: '관리자 부여', DEMOTE: '관리자 회수' }

export function AdminUsersPage() {
  const client = useQueryClient()
  const [status, setStatus] = useState<AdminUserStatus | ''>('')
  const [keywordDraft, setKeywordDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<{ user: AdminUserResponse; action: Action } | null>(null)
  const [reason, setReason] = useState('')
  const [suspendedUntil, setSuspendedUntil] = useState('')
  const query = useInfiniteQuery({
    queryKey: ['admin', 'users', status, keyword], initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminOperationsApi.users({ status, keyword, cursor: pageParam, size: 20 }),
    getNextPageParam: (page) => page.hasNext ? page.nextCursor : undefined,
  })
  const update = useMutation({
    mutationFn: async () => {
      if (!selected || !reason.trim()) throw new Error('조치 사유를 입력해 주세요.')
      const { user, action } = selected
      if (action === 'PROMOTE' || action === 'DEMOTE') {
        await adminOperationsApi.updateUserRole(user.userId, action === 'PROMOTE' ? 'ADMIN' : 'USER', reason.trim())
      } else {
        const until = action === 'SUSPEND' && suspendedUntil ? new Date(suspendedUntil).toISOString() : undefined
        await adminOperationsApi.updateUserStatus(user.userId, action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE', reason.trim(), until)
      }
    },
    onSuccess: async () => { setSelected(null); setReason(''); setSuspendedUntil(''); await client.invalidateQueries({ queryKey: ['admin'] }) },
  })
  const users = query.data?.pages.flatMap((page) => page.items) ?? []
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setKeyword(keywordDraft.trim()) }
  return <section className="admin-users-page">
    <div className="admin-page-heading"><div><span><UsersRound size={16} aria-hidden="true" /> 회원 운영</span><h1>회원 관리</h1><p>회원 상태와 역할을 관리합니다. 모든 변경에는 사유가 필요합니다.</p></div></div>
    <div className="admin-filter-card"><form className="admin-search-form" onSubmit={search}>
      <label><span className="sr-only">상태</span><select value={status} onChange={(event) => setStatus(event.target.value as AdminUserStatus | '')}><option value="">전체 상태</option><option value="ACTIVE">활동</option><option value="SUSPENDED">정지</option><option value="WITHDRAWN">탈퇴</option></select></label>
      <label><span className="sr-only">닉네임</span><input maxLength={20} placeholder="닉네임" value={keywordDraft} onChange={(event) => setKeywordDraft(event.target.value)} /></label>
      <button className="button button--primary" type="submit">검색</button>
    </form></div>
    {query.isLoading && <LoadingState label="회원 목록을 불러오는 중" />}
    {query.isError && <ErrorState title="회원 목록을 불러오지 못했어요" retry={() => void query.refetch()} />}
    {query.isSuccess && users.length === 0 && <EmptyState title="조건에 맞는 회원이 없습니다" description="검색 조건을 바꿔 다시 확인해 주세요." />}
    {users.length > 0 && <div className="admin-table-card"><div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">회원 목록</caption><thead><tr><th>ID</th><th>닉네임</th><th>역할</th><th>상태</th><th>상품</th><th>신고</th><th>가입일</th><th>조치</th></tr></thead><tbody>{users.map((user) => <tr key={user.userId}>
      <td>#{user.userId}</td><td>{user.nickname}</td><td>{user.role}</td><td>{user.status}{user.suspendedUntil && <small> ~ {new Date(user.suspendedUntil).toLocaleDateString('ko-KR')}</small>}</td><td>{user.listingCount}</td><td>{user.reportedCount}</td><td>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
      <td><div className="admin-row-actions">{user.status !== 'WITHDRAWN' && <>
        <button type="button" onClick={() => setSelected({ user, action: user.status === 'SUSPENDED' ? 'ACTIVATE' : 'SUSPEND' })}>{user.status === 'SUSPENDED' ? '정지 해제' : '정지'}</button>
        <button type="button" onClick={() => setSelected({ user, action: user.role === 'ADMIN' ? 'DEMOTE' : 'PROMOTE' })}>{user.role === 'ADMIN' ? '권한 회수' : '관리자 부여'}</button>
      </>}</div></td>
    </tr>)}</tbody></table></div></div>}
    {query.hasNextPage && <button className="load-more" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>더 보기</button>}
    {selected && <div className="admin-filter-card" role="dialog" aria-modal="false" aria-label={`${labels[selected.action]} 확인`}><h2>{selected.user.nickname} · {labels[selected.action]}</h2>
      <form onSubmit={(event) => { event.preventDefault(); update.mutate() }}>
        <label>조치 사유<input required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        {selected.action === 'SUSPEND' && <label>정지 종료 시각 (비우면 무기한)<input type="datetime-local" value={suspendedUntil} onChange={(event) => setSuspendedUntil(event.target.value)} /></label>}
        {update.isError && <p className="field-error" role="alert">{update.error.message}</p>}
        <button className="button button--primary" disabled={update.isPending} type="submit">확인</button>
        <button className="button button--secondary" type="button" disabled={update.isPending} onClick={() => { setSelected(null); update.reset() }}>취소</button>
      </form>
    </div>}
  </section>
}
