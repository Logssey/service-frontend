import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import '@/styles/global.css'
import '@/styles/auth.css'
import '@/features/community/community.css'
import '@/styles/completion.css'
import '@/features/account/account.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
