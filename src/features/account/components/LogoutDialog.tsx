import { useMutation } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { isUnauthenticated } from '@/features/account/model/queries'
import { useEndSession } from '@/features/account/model/useEndSession'
import { authApi } from '@/features/auth/api/authApi'
import { useToastStore } from '@/shared/state/toastStore'

const LOGGED_OUT = { message: '로그아웃되었습니다.', tone: 'info' } as const

/**
 * MY-001-D1 로그아웃 확인.
 *
 * 서버가 실패하면 로그인 상태를 그대로 둔다. refresh_token 쿠키는 HttpOnly라 프론트가 지울 수 없어서,
 * 로컬 상태만 지우면 새로고침할 때 다시 로그인된다. 401은 재발급까지 실패해 세션이 이미 끝난 경우다.
 */
export function LogoutDialog({ onClose }: { onClose: () => void }) {
  const endSession = useEndSession()
  const showToast = useToastStore((state) => state.show)
  const logout = useMutation({ mutationFn: () => authApi.logout() })
  const pending = logout.isPending

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, pending])

  const confirm = () =>
    logout.mutate(undefined, {
      onSuccess: () => endSession(LOGGED_OUT),
      onError: (error) => {
        if (isUnauthenticated(error)) {
          endSession(LOGGED_OUT)
          return
        }
        onClose()
        showToast('로그아웃하지 못했어요. 다시 시도해 주세요.')
      },
    })

  return (
    <div
      className="confirm-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <span className="confirm-dialog__icon is-brand" aria-hidden="true">
          <LogOut size={22} />
        </span>
        <h2 id="logout-dialog-title">로그아웃할까요?</h2>
        <p id="logout-dialog-description">
          이 기기에서만 로그아웃됩니다. 다른 기기의 로그인은 유지됩니다.
        </p>
        <div className="confirm-dialog__actions">
          <button
            className="button button--secondary"
            type="button"
            disabled={pending}
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="button button--primary"
            type="button"
            disabled={pending}
            onClick={confirm}
          >
            {pending ? '로그아웃 중…' : '로그아웃'}
          </button>
        </div>
      </section>
    </div>
  )
}
