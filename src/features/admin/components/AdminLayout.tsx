import { History, LayoutDashboard, LogOut, PackageSearch } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

export function AdminLayout() {
  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link className="admin-brand" to="/admin/listings">
          <span className="brand__mark" aria-hidden="true">
            R
          </span>
          <span>
            Re:Used
            <small>ADMIN</small>
          </span>
        </Link>
        <div className="admin-account">
          <span>Mock ADMIN</span>
          <Link to="/" aria-label="사용자 화면으로 이동">
            <LogOut size={17} aria-hidden="true" />
            사용자 화면
          </Link>
        </div>
      </header>
      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <p>콘텐츠 운영</p>
          <nav aria-label="관리자 메뉴">
            <span className="admin-nav__item is-disabled" aria-disabled="true">
              <LayoutDashboard size={18} aria-hidden="true" />
              대시보드
            </span>
            <NavLink
              className={({ isActive }) =>
                isActive ? 'admin-nav__item is-active' : 'admin-nav__item'
              }
              to="/admin/listings"
            >
              <PackageSearch size={18} aria-hidden="true" />
              게시글 관리
            </NavLink>
            <span className="admin-nav__item is-disabled" aria-disabled="true">
              <History size={18} aria-hidden="true" />
              거래 내역
            </span>
          </nav>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
