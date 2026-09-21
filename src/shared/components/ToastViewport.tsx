import { useEffect } from 'react'
import { CircleCheck, X } from 'lucide-react'
import { useToastStore } from '@/shared/state/toastStore'

export function ToastViewport() {
  const message = useToastStore((state) => state.message)
  const dismiss = useToastStore((state) => state.dismiss)

  useEffect(() => {
    if (!message) return undefined
    const timeout = window.setTimeout(dismiss, 2800)
    return () => window.clearTimeout(timeout)
  }, [dismiss, message])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <CircleCheck size={19} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" onClick={dismiss} aria-label="알림 닫기">
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
