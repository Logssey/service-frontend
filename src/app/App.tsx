import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
// 부수효과 import — A의 인증 경계에 실제 토큰 저장소를 연결한다. 지우면 모든 요청이 익명이 된다.
import '@/app/authWiring'
import { NotFoundPage } from '@/app/NotFoundPage'
import { MyPage } from '@/features/account/pages/MyPage'
import { WithdrawalPage } from '@/features/account/pages/WithdrawalPage'
import { AdminAccessBoundary } from '@/features/admin/components/AdminAccessBoundary'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { AdminListingsPage } from '@/features/admin/pages/AdminListingsPage'
import { AdminTradesPage } from '@/features/admin/pages/AdminTradesPage'
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage'
import { AdminUsersPage } from '@/features/admin/pages/AdminUsersPage'
import { AdminReportsPage } from '@/features/admin/pages/AdminReportsPage'
import { AdminNoticesPage } from '@/features/admin/pages/AdminNoticesPage'
import { AdminAuditLogsPage } from '@/features/admin/pages/AdminAuditLogsPage'
import { AdminCredentialStatusPage } from '@/features/admin/pages/AdminCredentialStatusPage'
import { RequireSession, SessionBootstrap } from '@/features/auth/components/SessionGuard'
import { EmailLoginPage } from '@/features/auth/pages/EmailLoginPage'
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
import { ReportFormPage } from '@/features/reports/pages/ReportFormPage'
import { MyReportsPage } from '@/features/reports/pages/MyReportsPage'
import { BlocksPage } from '@/features/blocks/pages/BlocksPage'
import { AccountSettingsPage } from '@/features/me/pages/AccountSettingsPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { NoticesPage, NoticeDetailPage } from '@/features/notices/NoticesPage'
import { SellerProfilePage } from '@/features/sellers/SellerProfilePage'
import { ChatbotPage } from '@/features/chatbot/ChatbotPage'
import { ToastViewport } from '@/shared/components/ToastViewport'
import { useAuthStore } from '@/features/auth/model/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Query keys for private data are shared by routes. Never show one account's
// cached chat/profile/report content after logout or an account switch.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.userId !== previous.user?.userId ||
    (previous.accessToken !== null && state.accessToken === null)) {
    queryClient.clear()
  }
})

export function AppRoutes() {
  return (
    <SessionBootstrap>
      <Routes>
        {/* 인증 — COM-001, AUTH-001~004. 소유 확인·온보딩은 화면이 직접 세션을 확인한다 */}
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/email" element={<EmailLoginPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/signup/email" element={<EmailSignupPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/password/reset" element={<PasswordResetPage />} />

        {/* 공개 — 서버도 인증 없이 허용하는 조회(SecurityConfig permitAll) */}
        <Route path="/" element={<ListingsPage />} />
        <Route path="/search" element={<ListingSearchPage />} />
        <Route path="/listings/:listingId" element={<ListingDetailPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:postId" element={<CommunityPostDetailPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/notices/:noticeId" element={<NoticeDetailPage />} />
        <Route path="/users/:userId" element={<SellerProfilePage />} />

        <Route element={<RequireSession />}>
          <Route path="/listings/new" element={<ListingFormPage />} />
          <Route path="/listings/:listingId/edit" element={<ListingFormPage />} />
          <Route path="/wishes" element={<WishesPage />} />
          {/* 마이페이지 — MY-001, MY-003 (screen-design/my-account.md). 내 활동은 MY-001 메뉴에서 들어간다 */}
          <Route path="/me" element={<MyPage />} />
          <Route path="/me/activity" element={<MyActivityPage />} />
          <Route path="/me/settings" element={<AccountSettingsPage />} />
          <Route path="/me/withdraw" element={<WithdrawalPage />} />
          <Route path="/reports/new" element={<ReportFormPage />} />
          <Route path="/reports/me" element={<MyReportsPage />} />
          <Route path="/blocks" element={<BlocksPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/trades/:tradeId/review" element={<ReviewFormPage />} />
          <Route path="/trades/:tradeId" element={<TradeDetailPage />} />
          <Route path="/chat" element={<ChatRoomsPage />} />
          <Route path="/chat/:chatRoomId" element={<ChatRoomPage />} />
          <Route path="/chat-rooms" element={<ChatRoomsPage />} />
          <Route path="/chat-rooms/:chatRoomId" element={<ChatRoomPage />} />
          <Route path="/community/new" element={<CommunityPostFormPage />} />
          <Route path="/community/:postId/edit" element={<CommunityPostFormPage />} />
          <Route
            path="/admin"
            element={
              <AdminAccessBoundary>
                <AdminLayout />
              </AdminAccessBoundary>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="listings" element={<AdminListingsPage />} />
            <Route path="trades" element={<AdminTradesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="notices" element={<AdminNoticesPage />} />
            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="credentials" element={<AdminCredentialStatusPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SessionBootstrap>
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
