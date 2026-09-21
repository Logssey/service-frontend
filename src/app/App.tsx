import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { NotFoundPage } from '@/app/NotFoundPage'
import { ChatRoomPage } from '@/features/chat/pages/ChatRoomPage'
import { ChatRoomsPage } from '@/features/chat/pages/ChatRoomsPage'
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
