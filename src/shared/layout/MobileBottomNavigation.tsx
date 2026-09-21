import {
  Bell,
  Heart,
  House,
  MessageCircle,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToastStore } from '@/shared/state/toastStore'

const futureItems = [
  { label: '찜', icon: Heart },
  { label: '채팅', icon: MessageCircle },
  { label: '알림', icon: Bell },
  { label: 'MY', icon: UserRound },
]

export function MobileBottomNavigation() {
  const showToast = useToastStore((state) => state.show)

  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      <Link className="bottom-navigation__item is-active" to="/" aria-current="page">
        <House aria-hidden="true" />
        <span>홈</span>
      </Link>
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
