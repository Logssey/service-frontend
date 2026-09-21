import {
  categoryFixtures,
  listingFixtures,
  PRODUCT_SHEET_URL,
} from '@/mocks/listingFixtures'
import type {
  ImageUploadResultResponse,
  ListingCreateRequest,
  ListingCreateResponse,
  ListingDetailResponse,
  ListingPage,
  ListingSearchRequest,
  ListingStatus,
  ListingSummaryResponse,
  ListingUpdateRequest,
} from '@/features/listings/model/types'
import type { WishResponse } from '@/features/wishes/model/types'

let listings = structuredClone(listingFixtures)
let nextImageId = 100

const wait = (milliseconds = 180) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function cursorToOffset(cursor?: string | null) {
  if (!cursor) return 0
  const offset = Number.parseInt(atob(cursor), 10)
  return Number.isNaN(offset) ? 0 : offset
}

function toListingSummary(listing: ListingDetailResponse): ListingSummaryResponse {
  return {
    listingId: listing.listingId,
    title: listing.title,
    price: listing.price,
    status: listing.status,
    itemCondition: listing.itemCondition,
    thumbnailUrl: listing.images[0]?.url ?? PRODUCT_SHEET_URL,
    wishCount: listing.wishCount,
    seller: {
      userId: listing.seller.userId,
      nickname: listing.seller.nickname,
      profileImageUrl: listing.seller.profileImageUrl,
    },
    createdAt: listing.createdAt,
  }
}

export const mockListingRepository = {
  async getCategories() {
    await wait(90)
    return structuredClone(categoryFixtures)
  },

  async getListings(request: ListingSearchRequest): Promise<ListingPage> {
    await wait()
    const keyword = request.keyword.trim().toLocaleLowerCase('ko-KR')
    const size = request.size ?? 20
    const offset = cursorToOffset(request.cursor)

    let filtered = listings.filter((listing) => {
      const matchesKeyword =
        !keyword ||
        `${listing.title} ${listing.description}`
          .toLocaleLowerCase('ko-KR')
          .includes(keyword)
      const matchesCategory =
        request.categoryId === null ||
        listing.category.categoryId === request.categoryId
      const matchesStatus =
        request.status === null || listing.status === request.status
      const matchesMinimum =
        request.minPrice === null || listing.price >= request.minPrice
      const matchesMaximum =
        request.maxPrice === null || listing.price <= request.maxPrice
      const matchesCondition =
        request.itemCondition === null ||
        listing.itemCondition === request.itemCondition

      return (
        matchesKeyword &&
        matchesCategory &&
        matchesStatus &&
        matchesMinimum &&
        matchesMaximum &&
        matchesCondition
      )
    })

    filtered = filtered.sort((left, right) => {
      if (request.sort === 'priceAsc') return left.price - right.price
      if (request.sort === 'priceDesc') return right.price - left.price
      return Date.parse(right.createdAt) - Date.parse(left.createdAt)
    })

    const pageItems = filtered.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length

    return {
      items: pageItems.map(toListingSummary),
      nextCursor: nextOffset < filtered.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < filtered.length,
    }
  },

  async getWishes(cursor?: string | null, size = 20): Promise<ListingPage> {
    await wait()
    const offset = cursorToOffset(cursor)
    const wishedListings = listings
      .filter((listing) => listing.isWished)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    const pageItems = wishedListings.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length

    return {
      items: pageItems.map(toListingSummary),
      nextCursor:
        nextOffset < wishedListings.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < wishedListings.length,
    }
  },

  async setWish(listingId: number, wished: boolean): Promise<WishResponse> {
    await wait(120)
    const listing = listings.find((item) => item.listingId === listingId)
    if (!listing) throw new Error('상품을 찾을 수 없습니다.')

    if (listing.isWished !== wished) {
      listing.isWished = wished
      listing.wishCount = Math.max(0, listing.wishCount + (wished ? 1 : -1))
    }

    return { wished: listing.isWished, wishCount: listing.wishCount }
  },

  async getListing(listingId: number): Promise<ListingDetailResponse> {
    await wait(110)
    const listing = listings.find((item) => item.listingId === listingId)
    if (!listing) throw new Error('상품을 찾을 수 없습니다.')
    return structuredClone(listing)
  },

  async uploadImages(files: File[]): Promise<ImageUploadResultResponse[]> {
    await wait(240)
    return files.map(() => {
      const imageId = nextImageId++
      return {
        imageId,
        status: 'VERIFIED' as const,
        url: PRODUCT_SHEET_URL,
        thumbnailUrl: PRODUCT_SHEET_URL,
      }
    })
  },

  async createListing(
    request: ListingCreateRequest,
  ): Promise<ListingCreateResponse> {
    await wait(240)
    const listingId = Math.max(...listings.map((listing) => listing.listingId)) + 1
    const category =
      categoryFixtures.find((item) => item.categoryId === request.categoryId) ??
      categoryFixtures[0]

    listings = [
      {
        listingId,
        ...request,
        status: 'ON_SALE',
        category,
        images: request.imageIds.map((imageId, displayOrder) => ({
          imageId,
          displayOrder,
          url: PRODUCT_SHEET_URL,
        })),
        wishCount: 0,
        viewCount: 0,
        isWished: false,
        isMine: true,
        seller: {
          userId: 3,
          nickname: '재현',
          profileImageUrl: null,
          completedTradeCount: 12,
          averageRating: 4.7,
        },
        createdAt: new Date().toISOString(),
      },
      ...listings,
    ]

    return { listingId }
  },

  async updateListing(
    listingId: number,
    request: ListingUpdateRequest,
  ): Promise<ListingDetailResponse> {
    await wait(240)
    const index = listings.findIndex((item) => item.listingId === listingId)
    if (index < 0) throw new Error('상품을 찾을 수 없습니다.')

    const current = listings[index]
    const category = request.categoryId
      ? (categoryFixtures.find(
          (item) => item.categoryId === request.categoryId,
        ) ?? current.category)
      : current.category
    const images = request.imageIds?.length
      ? request.imageIds.map((imageId, displayOrder) => ({
          imageId,
          displayOrder,
          url: PRODUCT_SHEET_URL,
        }))
      : current.images

    const updated: ListingDetailResponse = {
      ...current,
      ...request,
      category,
      images,
    }
    listings[index] = updated
    return structuredClone(updated)
  },

  setListingStatus(listingId: number, status: ListingStatus) {
    const listing = listings.find((item) => item.listingId === listingId)
    if (!listing) throw new Error('상품을 찾을 수 없습니다.')
    listing.status = status
  },

  reset() {
    listings = structuredClone(listingFixtures)
    nextImageId = 100
  },
}
