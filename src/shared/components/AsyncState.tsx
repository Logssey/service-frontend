import { AlertCircle, PackageOpen, RotateCcw } from 'lucide-react'

export function LoadingState({ label = '상품을 불러오는 중' }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="state-panel state-panel--empty">
      <PackageOpen size={34} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function ErrorState({
  retry,
  title = '상품을 불러오지 못했어요',
  description = '연결 상태를 확인한 뒤 다시 시도해 주세요.',
}: {
  retry: () => void
  title?: string
  description?: string
}) {
  return (
    <div className="state-panel" role="alert">
      <AlertCircle size={34} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      <button className="button button--secondary" type="button" onClick={retry}>
        <RotateCcw size={17} aria-hidden="true" />
        다시 시도
      </button>
    </div>
  )
}
