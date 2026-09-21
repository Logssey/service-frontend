import { EyeOff, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { AdminListingResponse } from '@/features/admin/model/types'
import { validateModerationReason } from '@/features/admin/model/validation'

export type AdminListingAction = 'HIDE' | 'RESTORE' | 'DELETE'

const actionCopy = {
  HIDE: {
    title: '게시글을 숨길까요?',
    description: '사용자 목록과 내 활동에서 즉시 노출되지 않습니다.',
    submitLabel: '숨김 적용',
    pendingLabel: '숨기는 중…',
    icon: EyeOff,
  },
  RESTORE: {
    title: '게시글을 복구할까요?',
    description: '숨김 직전 판매 상태로 돌아가며 사용자 목록에 다시 노출됩니다.',
    submitLabel: '복구 적용',
    pendingLabel: '복구하는 중…',
    icon: RotateCcw,
  },
  DELETE: {
    title: '게시글을 삭제할까요?',
    description: '논리 삭제되어 관리자 이력에는 남지만 사용자에게 노출되지 않습니다.',
    submitLabel: '삭제 적용',
    pendingLabel: '삭제하는 중…',
    icon: Trash2,
  },
} as const

export function AdminListingActionDialog({
  listing,
  action,
  isPending,
  requestError,
  onClose,
  onClearError,
  onConfirm,
}: {
  listing: AdminListingResponse
  action: AdminListingAction
  isPending: boolean
  requestError: string | null
  onClose: () => void
  onClearError: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const copy = actionCopy[action]
  const Icon = copy.icon
  const validationError = validateModerationReason(reason)
  const visibleError = (touched ? validationError : null) ?? requestError

  return (
    <div
      className="confirm-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose()
      }}
    >
      <section
        className="confirm-dialog admin-action-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-action-title"
        aria-describedby="admin-action-description"
      >
        <span
          className={`confirm-dialog__icon ${
            action === 'DELETE' ? 'is-danger' : 'is-brand'
          }`}
          aria-hidden="true"
        >
          <Icon size={22} />
        </span>
        <h2 id="admin-action-title">{copy.title}</h2>
        <p id="admin-action-description">
          <strong>{listing.title}</strong>
          <br />
          {copy.description}
        </p>
        <div className="admin-action-dialog__field">
          <label htmlFor="admin-action-reason">조치 사유</label>
          <textarea
            id="admin-action-reason"
            value={reason}
            maxLength={501}
            disabled={isPending}
            aria-invalid={visibleError ? 'true' : 'false'}
            placeholder="조치 근거를 1~500자로 입력하세요."
            onChange={(event) => {
              setReason(event.target.value)
              setTouched(true)
              onClearError()
            }}
          />
          <small>{reason.length} / 500</small>
        </div>
        {visibleError ? (
          <p className="confirm-dialog__error" role="alert">
            {visibleError}
          </p>
        ) : null}
        <div className="confirm-dialog__actions">
          <button
            className="button button--secondary"
            type="button"
            disabled={isPending}
            onClick={onClose}
          >
            취소
          </button>
          <button
            className={
              action === 'DELETE'
                ? 'button button--danger'
                : 'button button--primary'
            }
            type="button"
            disabled={isPending || validationError !== null}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? copy.pendingLabel : copy.submitLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
