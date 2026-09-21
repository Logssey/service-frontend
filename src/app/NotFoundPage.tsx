import { ArrowLeft, Home } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <main className="not-found">
      <span>404</span>
      <h1>페이지를 찾을 수 없어요</h1>
      <p>주소가 바뀌었거나 사라진 페이지일 수 있습니다.</p>
      <div>
        <button className="button button--secondary" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} aria-hidden="true" /> 이전 화면
        </button>
        <Link className="button button--primary" to="/">
          <Home size={18} aria-hidden="true" /> 홈으로
        </Link>
      </div>
    </main>
  )
}
