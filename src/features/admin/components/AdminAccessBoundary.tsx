import { ShieldX } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMyProfile } from '@/features/account/model/queries'
import { usesAuthMocks } from '@/features/auth/lib/authMode'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'

/**
 * 관리자 화면 진입 확인. 로그인한 회원(GET /users/me)이 이용 중인 ADMIN일 때만 연다.
 *
 * 화면을 가리는 것뿐이고 최종 권한 검증은 서버가 요청마다 한다(ADMIN이 아니거나 정지 중이면 403).
 * 목 모드는 백엔드 없이 둘러보는 데모라 관리자 화면을 그대로 연다.
 */
export function AdminAccessBoundary({ children }: { children: ReactNode }) {
  const me = useMyProfile({ enabled: !usesAuthMocks })

  if (usesAuthMocks) return children
  if (me.isPending) return <LoadingState label="권한을 확인하는 중" />
  if (me.isError) {
    return <ErrorState title="권한을 확인하지 못했어요" retry={() => void me.refetch()} />
  }

  if (me.data.role !== 'ADMIN' || me.data.status !== 'ACTIVE') {
    return (
      <main className="admin-access-denied">
        <ShieldX size={42} aria-hidden="true" />
        <h1>관리자 권한이 필요합니다</h1>
        <p>접근 권한을 확인한 뒤 다시 시도해 주세요.</p>
      </main>
    )
  }

  return children
}
