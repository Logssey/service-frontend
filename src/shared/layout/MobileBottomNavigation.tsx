import {
  Heart,
  House,
  MessageCircle,
  MessagesSquare,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface NavigationItem {
  label: string
  icon: LucideIcon
  to: string
  end: boolean
}

const navigationItems: NavigationItem[] = [
  { label: '홈', icon: House, to: '/', end: true },
  { label: '찜', icon: Heart, to: '/wishes', end: false },
  { label: '채팅', icon: MessageCircle, to: '/chat', end: false },
  { label: '커뮤니티', icon: MessagesSquare, to: '/community', end: false },
  { label: 'MY', icon: UserRound, to: '/me', end: false },
]

export function MobileBottomNavigation() {
  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      {navigationItems.map((item) => {
        const Icon = item.icon
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
      })}
    </nav>
  )
}
