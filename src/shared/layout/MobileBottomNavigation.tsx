import {
  Bell,
  Heart,
  House,
  MessageCircle,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useToastStore } from '@/shared/state/toastStore'

type NavigationItem =
  | { kind: 'link'; label: string; icon: LucideIcon; to: string; end: boolean }
  | { kind: 'future'; label: string; icon: LucideIcon }

const navigationItems: NavigationItem[] = [
  { kind: 'link', label: '홈', icon: House, to: '/', end: true },
  { kind: 'link', label: '찜', icon: Heart, to: '/wishes', end: false },
  { kind: 'link', label: '채팅', icon: MessageCircle, to: '/chat', end: false },
  { kind: 'future', label: '알림', icon: Bell },
  { kind: 'link', label: 'MY', icon: UserRound, to: '/me', end: false },
]

export function MobileBottomNavigation() {
  const showToast = useToastStore((state) => state.show)

  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      {navigationItems.map((item) => {
        const Icon = item.icon
        if (item.kind === 'link') {
          return (
            <NavLink
              className={({ isActive }) =>
                isActive
                  ? 'bottom-navigation__item is-active'
                  : 'bottom-navigation__item'
              }
              end={item.end}
              to={item.to}
              key={item.label}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        }
        return (
          <button
            className="bottom-navigation__item"
            type="button"
            key={item.label}
            onClick={() =>
              showToast(`${item.label} 화면은 다음 단계에서 연결됩니다.`)
            }
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
