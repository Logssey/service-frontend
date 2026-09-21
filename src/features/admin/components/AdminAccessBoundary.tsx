import { ShieldX } from 'lucide-react'
import type { ReactNode } from 'react'

type MockRole = 'USER' | 'ADMIN'

const mockCurrentUser: { role: MockRole } = { role: 'ADMIN' }

export function AdminAccessBoundary({ children }: { children: ReactNode }) {
  // TODO(auth): 개발자 B의 CurrentUserProvider가 준비되면 mock 역할을 실제
  // 로그인 사용자의 ADMIN 역할 검사로 교체한다. 최종 권한 검증은 서버가 수행한다.
  if (mockCurrentUser.role !== 'ADMIN') {
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
