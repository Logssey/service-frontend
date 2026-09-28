import { useQuery } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { adminOperationsApi } from '@/features/admin/api/adminOperationsApi'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'

const serviceNames: Record<string, string> = {
  JWT: '인증 토큰', DATABASE: '데이터베이스', REDIS: 'Redis', SMTP: '이메일',
  KAKAO_OAUTH: '카카오 로그인', IMAGE_STORAGE: '이미지 저장소', LLM: '외부 LLM',
}

export function AdminCredentialStatusPage() {
  const query = useQuery({ queryKey: ['admin', 'credentials', 'status'],
    queryFn: adminOperationsApi.credentialStatus, retry: false })
  return <section className="admin-credentials-page">
    <div className="admin-page-heading"><div><span><KeyRound size={16} aria-hidden="true" /> 연동 상태</span>
      <h1>인증정보 상태</h1><p>설정 존재 여부와 사용 여부만 표시합니다. 연결 성공 여부는 별도 점검이 필요합니다.</p>
    </div><small>READ ONLY</small></div>
    {query.isLoading && <LoadingState label="연동 설정 상태를 불러오는 중" />}
    {query.isError && <ErrorState title="연동 설정 상태를 불러오지 못했어요" retry={() => void query.refetch()} />}
    {query.data && <div className="admin-table-card"><div className="admin-table-scroll">
      <table className="admin-table"><caption className="sr-only">인증정보 설정 상태</caption>
        <thead><tr><th>서비스</th><th>설정</th><th>사용</th><th>주입 방식</th></tr></thead>
        <tbody>{query.data.credentials.map((item) => <tr key={item.service}>
          <td>{serviceNames[item.service] ?? item.service}</td>
          <td>{item.configured ? '설정됨' : '미설정'}</td>
          <td>{item.enabled ? '사용 중' : '비활성'}</td>
          <td>{item.source === 'DEFAULT_PROVIDER_CHAIN' ? '클라우드 권한 체인' : '애플리케이션 설정'}</td>
        </tr>)}</tbody>
      </table></div></div>}
    <p className="field-help">비밀번호·토큰·키의 값은 이 화면이나 API에서 조회할 수 없습니다.</p>
  </section>
}
