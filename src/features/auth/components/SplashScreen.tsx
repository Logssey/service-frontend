/** COM-001 스플래시 화면. 세션을 되살리는 동안 보여 준다. */
export function SplashScreen() {
  return (
    <div className="app-page auth-page">
      <main className="auth-shell">
        <div className="brand brand--splash">
          <span className="brand__mark" aria-hidden="true">
            R
          </span>
          <div>
            <strong>Re:Used</strong>
            <p>다시 쓰는 좋은 물건</p>
          </div>
        </div>
        <div className="state-panel" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>로딩 중…</p>
        </div>
      </main>
    </div>
  )
}
