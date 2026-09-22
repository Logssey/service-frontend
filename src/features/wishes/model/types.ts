import type { ListingPage } from '@/features/listings/model/types'

export interface WishResponse {
  wished: boolean
  wishCount: number
}

export type WishPage = ListingPage
