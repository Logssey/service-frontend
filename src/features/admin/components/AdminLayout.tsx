import { ClipboardList, FileText, History, KeyRound, LayoutDashboard, LogOut, Megaphone, PackageSearch, UsersRound } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/features/auth/api/authApi'
import { useAuthStore } from '@/features/auth/model/authStore'
import '@/features/admin/adminOperations.css'

const links = [
  { to: '/admin', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/admin/listings', label: '게시글 관리', icon: PackageSearch },
  { to: '/admin/trades', label: '거래 내역', icon: History },
  { to: '/admin/users', label: '회원 관리', icon: UsersRound },
  { to: '/admin/reports', label: '신고 관리', icon: ClipboardList },
  { to: '/admin/notices', label: '공지 관리', icon: Megaphone },
  { to: '/admin/audit-logs', label: '감사 로그', icon: FileText },
  { to: '/admin/credentials', label: '연동 설정 상태', icon: KeyRound },
]

export function AdminLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const { data: profile } = useQuery({ queryKey: ['auth', 'me', accessToken], queryFn: authApi.me, refetchOnMount: false })
  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link className="admin-brand" to="/admin">
          <span className="brand__mark" aria-hidden="true">
            R
          </span>
          <span>
            Re:Used
            <small>ADMIN</small>
          </span>
        </Link>
        <div className="admin-account">
          <span>{profile?.nickname ?? '관리자'}</span>
          <Link to="/" aria-label="사용자 화면으로 이동">
            <LogOut size={17} aria-hidden="true" />
            사용자 화면
          </Link>
        </div>
      </header>
      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <p>서비스 운영</p>
          <nav aria-label="관리자 메뉴">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'admin-nav__item is-active' : 'admin-nav__item'}>
                <Icon size={18} aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
