import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard } from 'lucide-react'
import { adminOperationsApi } from '@/features/admin/api/adminOperationsApi'
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { Link } from 'react-router-dom'

const metrics = [
  ['전체 회원', 'totalUsers'], ['활동 회원', 'activeUsers'], ['정지 회원', 'suspendedUsers'],
  ['전체 상품', 'totalListings'], ['판매 중', 'onSaleListings'], ['완료 거래', 'completedTrades'],
  ['처리 대기 신고', 'pendingReports'],
] as const

export function AdminDashboardPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminOperationsApi.dashboard })
  const chatbot = useQuery({ queryKey: ['admin', 'chatbot'], queryFn: adminOperationsApi.chatbot })
  const updateChatbot = useMutation({
    mutationFn: (enabled: boolean) => adminOperationsApi.updateChatbot(enabled),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['admin', 'chatbot'] }); await client.invalidateQueries({ queryKey: ['chatbot'] }) },
  })
  return <section className="admin-dashboard-page">
    <div className="admin-page-heading"><div><span><LayoutDashboard size={16} aria-hidden="true" /> 운영 현황</span><h1>대시보드</h1><p>서비스 주요 지표를 확인합니다.</p></div></div>
    {query.isLoading && <LoadingState label="운영 현황을 불러오는 중" />}
    {query.isError && <ErrorState title="운영 현황을 불러오지 못했어요" retry={() => void query.refetch()} />}
    {query.data ? <div className="admin-metric-grid">{metrics.map(([label, key]) => <div className="admin-metric-card" key={key}><span>{label}</span><strong>{query.data[key].toLocaleString('ko-KR')}</strong></div>)}</div> : null}
    {query.isSuccess && !query.data && <EmptyState title="운영 데이터가 없습니다" description="잠시 후 다시 확인해 주세요." />}
    <section className="admin-filter-card" aria-label="챗봇 설정">
      <h2>챗봇 운영</h2>
      {chatbot.isLoading && <LoadingState label="챗봇 상태를 불러오는 중" />}
      {chatbot.isError && <ErrorState title="챗봇 상태를 불러오지 못했어요" retry={() => void chatbot.refetch()} />}
      {chatbot.data && <>
        <label className="admin-feature-switch"><input type="checkbox" checked={chatbot.data.adminEnabled} disabled={updateChatbot.isPending || !chatbot.data.environmentEnabled} onChange={(event) => updateChatbot.mutate(event.target.checked)} /> 추천 질문 챗봇 사용</label>
        <p>현재 {chatbot.data.enabled ? '활성' : '비활성'} 상태입니다.</p>
        {!chatbot.data.environmentEnabled && <p>서버 환경 설정(CHATBOT_ENABLED)이 꺼져 있어 관리자 설정으로 켤 수 없습니다.</p>}
        <p>자유입력 챗봇은 개인정보 보호 정책에 따라 {chatbot.data.freeInputEnabled ? '활성' : '비활성'} 상태입니다.</p>
      </>}
      {updateChatbot.isError && <p className="field-error" role="alert">{updateChatbot.error.message}</p>}
    </section>
    <div className="admin-dashboard-links"><Link className="button button--secondary" to="/admin/reports">신고 처리</Link><Link className="button button--secondary" to="/admin/users">회원 관리</Link></div>
  </section>
}
