import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// 부수효과 import — A의 인증 경계에 실제 토큰 저장소를 연결한다. 지우면 모든 요청이 익명이 된다.
import '@/app/authWiring'
import { NotFoundPage } from '@/app/NotFoundPage'
import { AdminAccessBoundary } from '@/features/admin/components/AdminAccessBoundary'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { AdminListingsPage } from '@/features/admin/pages/AdminListingsPage'
import { AdminTradesPage } from '@/features/admin/pages/AdminTradesPage'
import { EmailSignupPage } from '@/features/auth/pages/EmailSignupPage'
import { EmailVerificationPage } from '@/features/auth/pages/EmailVerificationPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { OAuthCallbackPage } from '@/features/auth/pages/OAuthCallbackPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { PasswordResetPage } from '@/features/auth/pages/PasswordResetPage'
import { SplashPage } from '@/features/auth/pages/SplashPage'
import { ChatRoomPage } from '@/features/chat/pages/ChatRoomPage'
import { ChatRoomsPage } from '@/features/chat/pages/ChatRoomsPage'
import { CommunityPage } from '@/features/community/pages/CommunityPage'
import { CommunityPostDetailPage } from '@/features/community/pages/CommunityPostDetailPage'
import { CommunityPostFormPage } from '@/features/community/pages/CommunityPostFormPage'
import { ListingDetailPage } from '@/features/listings/pages/ListingDetailPage'
import { ListingFormPage } from '@/features/listings/pages/ListingFormPage'
import { ListingSearchPage } from '@/features/listings/pages/ListingSearchPage'
import { ListingsPage } from '@/features/listings/pages/ListingsPage'
import { MyActivityPage } from '@/features/me/pages/MyActivityPage'
import { ReviewFormPage } from '@/features/reviews/pages/ReviewFormPage'
import { TradeDetailPage } from '@/features/trades/pages/TradeDetailPage'
import { TradesPage } from '@/features/trades/pages/TradesPage'
import { WishesPage } from '@/features/wishes/pages/WishesPage'
import { ToastViewport } from '@/shared/components/ToastViewport'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppRoutes() {
  return (
    <Routes>
      {/* 인증 — COM-001, AUTH-001~004 */}
      <Route path="/splash" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/signup/email" element={<EmailSignupPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/password/reset" element={<PasswordResetPage />} />

      <Route path="/" element={<ListingsPage />} />
      <Route path="/search" element={<ListingSearchPage />} />
      <Route path="/listings/new" element={<ListingFormPage />} />
      <Route path="/listings/:listingId" element={<ListingDetailPage />} />
      <Route path="/listings/:listingId/edit" element={<ListingFormPage />} />
      <Route path="/wishes" element={<WishesPage />} />
      <Route path="/me" element={<MyActivityPage />} />
      <Route path="/trades" element={<TradesPage />} />
      <Route path="/trades/:tradeId/review" element={<ReviewFormPage />} />
      <Route path="/trades/:tradeId" element={<TradeDetailPage />} />
      <Route path="/chat" element={<ChatRoomsPage />} />
      <Route path="/chat/:chatRoomId" element={<ChatRoomPage />} />
      <Route path="/chat-rooms" element={<ChatRoomsPage />} />
      <Route path="/chat-rooms/:chatRoomId" element={<ChatRoomPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/community/new" element={<CommunityPostFormPage />} />
      <Route path="/community/:postId/edit" element={<CommunityPostFormPage />} />
      <Route path="/community/:postId" element={<CommunityPostDetailPage />} />
      <Route
        path="/admin"
        element={
          <AdminAccessBoundary>
            <AdminLayout />
          </AdminAccessBoundary>
        }
      >
        <Route index element={<Navigate to="listings" replace />} />
        <Route path="listings" element={<AdminListingsPage />} />
        <Route path="trades" element={<AdminTradesPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <ToastViewport />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
