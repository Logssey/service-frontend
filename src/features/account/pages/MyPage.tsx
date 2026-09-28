import { ChevronRight, MailWarning, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogoutDialog } from '@/features/account/components/LogoutDialog'
import {
  isUnauthenticated,
  useMyProfile,
  useMySellerProfile,
} from '@/features/account/model/queries'
import type { SellerProfileResponse } from '@/features/account/model/types'
import type { MyProfileResponse } from '@/features/auth/model/types'
import { ErrorState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { MobileBottomNavigation } from '@/shared/layout/MobileBottomNavigation'
import { useToastStore } from '@/shared/state/toastStore'

interface MenuItem {
  label: string
  /** 없으면 아직 화면이 없는 메뉴다. 누르면 준비 중 안내를 띄운다(my-account.md 팀 확인 3). */
  to?: string
  tag?: string
}

const ACTIVITY_MENU: MenuItem[] = [
  { label: '판매 관리', to: '/me/activity' },
  { label: '거래 내역', to: '/trades' },
  { label: '찜 목록', to: '/wishes' },
  { label: '받은 후기', to: '/me/activity?tab=reviews' },
]

const TRUST_MENU: MenuItem[] = [
  { label: '내 신고 내역', to: '/reports/me' },
  { label: '차단 목록', to: '/blocks' },
  { label: '알림', to: '/notifications' },
  { label: '공지사항', to: '/notices' },
]

/** 비밀번호는 이메일 계정에만 있다(ADR-016). 카카오 계정은 이 묶음을 통째로 숨긴다. */
const ACCOUNT_MENU: MenuItem[] = [{ label: '비밀번호 변경', to: '/me/settings', tag: '이메일 계정' }]

const COMING_SOON = '준비 중인 기능입니다.'

const suspensionFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * 정지 해제 작업이 최대 1분 늦게 돌아서 기간이 끝났는데도 status가 SUSPENDED로 올 수 있다.
 * 그래서 status만 보지 않고 suspendedUntil을 현재 시각과 비교한다.
 */
function suspensionPeriod(profile: MyProfileResponse, now: number): string | null {
  if (profile.status !== 'SUSPENDED') return null
  if (profile.suspendedUntil === null) return '해제될 때까지'
  const until = Date.parse(profile.suspendedUntil)
  return until > now ? `${suspensionFormatter.format(until)}까지` : null
}

function trustSummary(seller: SellerProfileResponse) {
  const rating = seller.averageRating === null ? '후기 없음' : `★ ${seller.averageRating.toFixed(1)}`
  return `${rating} · 거래 ${seller.completedTradeCount}회`
}

/**
 * MY-001 마이페이지(my-account.md).
 *
 * 메뉴와 로그아웃은 본인 정보와 무관하므로 조회가 실패해도 그대로 쓸 수 있다.
 * 평점·거래 수는 판매자 프로필 API로 채우고, 그 조회만 실패하면 그 줄만 숨긴다.
 */
export function MyPage() {
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const profileQuery = useMyProfile()
  const profile = profileQuery.data
  const sellerQuery = useMySellerProfile(profile?.userId)
  const [now] = useState(() => Date.now())
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const sessionExpired = isUnauthenticated(profileQuery.error)

  useEffect(() => {
    if (sessionExpired) {
      navigate('/login', { replace: true, state: { message: '로그인이 필요합니다.' } })
    }
  }, [navigate, sessionExpired])

  const comingSoon = () => showToast(COMING_SOON)
  const suspension = profile ? suspensionPeriod(profile, now) : null
  const unverifiedEmail = profile?.email && !profile.emailVerified ? profile.email : null

  return (
    <div className="app-page my-page">
      <PageHeader title="MY" />
      <main className="content-shell my-page-content">
        {profileQuery.isError && !sessionExpired ? (
          <ErrorState
            title="정보를 불러오지 못했어요"
            retry={() => void profileQuery.refetch()}
          />
        ) : null}

        {profile ? (
          <Link className="my-profile" to="/me/settings">
            {profile.profileImageUrl ? (
              <img className="my-profile__avatar" src={profile.profileImageUrl} alt="" />
            ) : (
              <span className="avatar my-profile__avatar" aria-hidden="true">
                {profile.nickname.slice(0, 1)}
              </span>
            )}
            <span className="my-profile__copy">
              <strong>{profile.nickname}</strong>
              {sellerQuery.data ? <span>{trustSummary(sellerQuery.data)}</span> : null}
            </span>
            <span className="sr-only">프로필 수정</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        ) : null}
        {profileQuery.isPending ? (
          <div className="my-profile my-profile--loading" role="status">
            <span className="sr-only">내 정보를 불러오는 중</span>
          </div>
        ) : null}

        {suspension ? (
          <div className="my-banner my-banner--danger" role="status">
            <ShieldAlert aria-hidden="true" />
            <div>
              <strong>이용정지 중 · {suspension}</strong>
              <p>글 작성, 거래, 채팅 전송, 신고가 제한됩니다.</p>
            </div>
          </div>
        ) : null}
        {unverifiedEmail ? (
          <div className="my-banner my-banner--brand">
            <MailWarning aria-hidden="true" />
            <div>
              <strong>이메일 인증이 필요해요</strong>
              <p>{unverifiedEmail}</p>
            </div>
            <Link className="my-banner__action" to="/verify-email">
              인증하기
            </Link>
          </div>
        ) : null}

        <nav className="my-menu" aria-label="마이페이지 메뉴">
          <MenuGroup items={ACTIVITY_MENU} onComingSoon={comingSoon} />
          <MenuGroup items={TRUST_MENU} onComingSoon={comingSoon} />
          {profile?.provider === 'LOCAL' ? (
            <MenuGroup items={ACCOUNT_MENU} onComingSoon={comingSoon} />
          ) : null}
        </nav>

        <div className="my-account-actions">
          <button type="button" onClick={() => setConfirmingLogout(true)}>
            로그아웃
          </button>
          <Link to="/me/withdraw">회원 탈퇴</Link>
        </div>
      </main>
      <MobileBottomNavigation />
      {confirmingLogout ? <LogoutDialog onClose={() => setConfirmingLogout(false)} /> : null}
    </div>
  )
}

function MenuGroup({ items, onComingSoon }: { items: MenuItem[]; onComingSoon: () => void }) {
  return (
    <ul className="my-menu__group">
      {items.map((item) => {
        const content = (
          <>
            <span>{item.label}</span>
            {item.tag ? <small className="my-menu__tag">{item.tag}</small> : null}
            <ChevronRight aria-hidden="true" />
          </>
        )
        return (
          <li key={item.label}>
            {item.to ? (
              <Link className="my-menu__item" to={item.to}>
                {content}
              </Link>
            ) : (
              <button className="my-menu__item" type="button" onClick={onComingSoon}>
                {content}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
