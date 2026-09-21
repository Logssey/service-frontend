import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { NotFoundPage } from '@/app/NotFoundPage'
import { ListingDetailPage } from '@/features/listings/pages/ListingDetailPage'
import { ListingFormPage } from '@/features/listings/pages/ListingFormPage'
import { ListingSearchPage } from '@/features/listings/pages/ListingSearchPage'
import { ListingsPage } from '@/features/listings/pages/ListingsPage'
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
