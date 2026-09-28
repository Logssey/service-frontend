import { useQuery } from '@tanstack/react-query'
import { ShieldX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/model/authStore'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'

export function AdminAccessBoundary({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const profile = useQuery({ queryKey: ['auth', 'me', accessToken], queryFn: authApi.me, retry: false, refetchOnMount: 'always' })
  if (profile.isFetching) return <main className="admin-access-denied"><LoadingState label="관리자 권한을 확인하는 중" /></main>
  if (profile.isError) return <main className="admin-access-denied"><ErrorState title="로그인 정보를 확인하지 못했어요" retry={() => void profile.refetch()} /><Link to="/login">로그인</Link></main>
  if (profile.data?.role !== 'ADMIN') return <main className="admin-access-denied"><ShieldX size={42} aria-hidden="true" /><h1>관리자 권한이 필요합니다</h1><p>관리자 계정으로 로그인해 주세요.</p><Link to="/">홈으로</Link></main>
  return children
}
