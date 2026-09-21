import {
  Bell,
  Heart,
  House,
  MessageCircle,
  UserRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useToastStore } from '@/shared/state/toastStore'

const linkedItems = [
  { label: '홈', icon: House, to: '/', end: true },
  { label: '찜', icon: Heart, to: '/wishes', end: false },
  { label: '채팅', icon: MessageCircle, to: '/chat', end: false },
]

const futureItems = [
  { label: '알림', icon: Bell },
  { label: 'MY', icon: UserRound },
]

export function MobileBottomNavigation() {
  const showToast = useToastStore((state) => state.show)

  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      {linkedItems.map(({ label, icon: Icon, to, end }) => (
        <NavLink
          className={({ isActive }) =>
            isActive
              ? 'bottom-navigation__item is-active'
              : 'bottom-navigation__item'
          }
          end={end}
          to={to}
          key={label}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
      {futureItems.map(({ label, icon: Icon }) => (
        <button
          className="bottom-navigation__item"
          type="button"
          key={label}
          onClick={() => showToast(`${label} 화면은 다음 단계에서 연결됩니다.`)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
