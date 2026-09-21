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
import type {
  MyListingPage,
  MyListingResponse,
  MyListingSearchRequest,
} from '@/features/me/model/types'
import type { WishResponse } from '@/features/wishes/model/types'
import { ApiClientError } from '@/shared/api/http'

let listings = structuredClone(listingFixtures)
let nextImageId = 100
let activeTradeExists: (listingId: number) => boolean = () => false
let pendingTradeCountForListing: (listingId: number) => number = () => 0

interface MockImageRecord extends ImageUploadResultResponse {
  attachedListingId: number | null
}

function createInitialImages() {
  return new Map<number, MockImageRecord>(
    listingFixtures.flatMap((listing) =>
      listing.images.map((image) => [
        image.imageId,
        {
          imageId: image.imageId,
          status: 'VERIFIED' as const,
          url: image.url,
          thumbnailUrl: image.url,
          attachedListingId: listing.listingId,
        },
      ] as const),
    ),
  )
}

let images = createInitialImages()

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

function toMyListing(listing: ListingDetailResponse): MyListingResponse {
  return {
    listingId: listing.listingId,
    title: listing.title,
    price: listing.price,
    status: listing.status,
    thumbnailUrl: listing.images[0]?.url ?? PRODUCT_SHEET_URL,
    wishCount: listing.wishCount,
    viewCount: listing.viewCount,
    pendingTradeCount: pendingTradeCountForListing(listing.listingId),
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
    if (!listing) {
      throw new ApiClientError(404, 'NOT_FOUND', '상품을 찾을 수 없습니다.')
    }
    return structuredClone(listing)
  },

  async getMySellingListings(
    request: MyListingSearchRequest,
  ): Promise<MyListingPage> {
    await wait()
    const offset = cursorToOffset(request.cursor)
    const size = request.size ?? 20
    const filtered = listings
      .filter((listing) => listing.isMine)
      .filter((listing) => !request.status || listing.status === request.status)
      .sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )
    const pageItems = filtered.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length

    return {
      items: pageItems.map(toMyListing),
      nextCursor: nextOffset < filtered.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < filtered.length,
    }
  },

  async uploadImages(files: File[]): Promise<ImageUploadResultResponse[]> {
    await wait(240)
    return files.map(() => {
      const imageId = nextImageId++
      const image: MockImageRecord = {
        imageId,
        status: 'VERIFIED' as const,
        url: PRODUCT_SHEET_URL,
        thumbnailUrl: PRODUCT_SHEET_URL,
        attachedListingId: null,
      }
      images.set(imageId, image)
      return {
        imageId: image.imageId,
        status: image.status,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
      }
    })
  },

  async deleteImage(imageId: number): Promise<void> {
    await wait(100)
    const image = images.get(imageId)
    if (!image) {
      throw new ApiClientError(404, 'NOT_FOUND', '이미지를 찾을 수 없습니다.')
    }
    if (image.attachedListingId !== null) {
      throw new ApiClientError(
        409,
        'CONFLICT',
        '게시글에 연결된 이미지는 상품 수정으로 제거해 주세요.',
      )
    }
    images.delete(imageId)
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
    request.imageIds.forEach((imageId) => {
      const image = images.get(imageId)
      if (image) image.attachedListingId = listingId
    })

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
    const nextImages =
      request.imageIds !== undefined
        ? request.imageIds.map((imageId, displayOrder) => ({
            imageId,
            displayOrder,
            url: images.get(imageId)?.url ?? PRODUCT_SHEET_URL,
          }))
        : current.images

    if (request.imageIds !== undefined) {
      const retainedIds = new Set(request.imageIds)
      current.images.forEach((image) => {
        if (!retainedIds.has(image.imageId)) images.delete(image.imageId)
      })
      request.imageIds.forEach((imageId) => {
        const image = images.get(imageId)
        if (image) image.attachedListingId = listingId
      })
    }

    const updated: ListingDetailResponse = {
      ...current,
      ...request,
      category,
      images: nextImages,
    }
    listings[index] = updated
    return structuredClone(updated)
  },

  async deleteListing(listingId: number): Promise<void> {
    await wait(180)
    const index = listings.findIndex((item) => item.listingId === listingId)
    if (index < 0) {
      throw new ApiClientError(404, 'NOT_FOUND', '상품을 찾을 수 없습니다.')
    }
    const listing = listings[index]
    if (!listing.isMine) {
      throw new ApiClientError(403, 'FORBIDDEN', '본인의 상품만 삭제할 수 있습니다.')
    }
    if (activeTradeExists(listingId)) {
      throw new ApiClientError(
        409,
        'CONFLICT',
        '진행 중인 거래가 있어 상품을 삭제할 수 없습니다. 거래를 먼저 종료해 주세요.',
      )
    }

    listing.images.forEach((image) => images.delete(image.imageId))
    listings.splice(index, 1)
  },

  configureActiveTradeLookup(lookup: (listingId: number) => boolean) {
    activeTradeExists = lookup
  },

  configurePendingTradeCountLookup(
    lookup: (listingId: number) => number,
  ) {
    pendingTradeCountForListing = lookup
  },

  hasImage(imageId: number) {
    return images.has(imageId)
  },

  setListingStatus(listingId: number, status: ListingStatus) {
    const listing = listings.find((item) => item.listingId === listingId)
    if (!listing) throw new Error('상품을 찾을 수 없습니다.')
    listing.status = status
  },

  reset() {
    listings = structuredClone(listingFixtures)
    nextImageId = 100
    images = createInitialImages()
  },
}
