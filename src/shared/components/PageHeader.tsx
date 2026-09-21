import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function PageHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  const navigate = useNavigate()

  return (
    <header className="page-header">
      <button
        className="icon-button"
        type="button"
        onClick={() => navigate(-1)}
        aria-label="이전 화면"
      >
        <ArrowLeft aria-hidden="true" />
      </button>
      <h1>{title}</h1>
      <div className="page-header__action">{action}</div>
    </header>
  )
}
