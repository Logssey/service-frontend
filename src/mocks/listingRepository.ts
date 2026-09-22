import {
  categoryFixtures,
  listingFixtures,
  PRODUCT_SHEET_URL,
} from '@/mocks/listingFixtures'
import type {
  AdminDeleteRequest,
  AdminListingPage,
  AdminListingResponse,
  AdminListingSearchRequest,
  AdminListingStatusRequest,
  AdminListingStatusResponse,
} from '@/features/admin/model/types'
import { validateModerationReason } from '@/features/admin/model/validation'
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

interface ListingModerationMetadata {
  reportCount: number
  isDeleted: boolean
  statusBeforeHidden: Exclude<ListingStatus, 'HIDDEN'> | null
}

const initialReportCounts: Record<number, number> = {
  101: 2,
  102: 0,
  103: 1,
  104: 0,
  105: 3,
  106: 2,
  107: 4,
  108: 0,
  109: 1,
  110: 0,
}

function createInitialListings() {
  const initial = structuredClone(listingFixtures)
  const hiddenListing = initial.find((listing) => listing.listingId === 107)
  if (hiddenListing) hiddenListing.status = 'HIDDEN'
  return initial
}

function createInitialModerationMetadata() {
  return new Map<number, ListingModerationMetadata>(
    listingFixtures.map((listing) => [
      listing.listingId,
      {
        reportCount: initialReportCounts[listing.listingId] ?? 0,
        isDeleted: listing.listingId === 106,
        statusBeforeHidden:
          listing.listingId === 107 ? ('ON_SALE' as const) : null,
      },
    ]),
  )
}

let listings = createInitialListings()
let moderationMetadata = createInitialModerationMetadata()
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

function getModerationMetadata(listingId: number) {
  const existing = moderationMetadata.get(listingId)
  if (existing) return existing

  const created: ListingModerationMetadata = {
    reportCount: 0,
    isDeleted: false,
    statusBeforeHidden: null,
  }
  moderationMetadata.set(listingId, created)
  return created
}

function isPubliclyVisible(listing: ListingDetailResponse) {
  const moderation = getModerationMetadata(listing.listingId)
  return !moderation.isDeleted && listing.status !== 'HIDDEN'
}

function assertValidModerationReason(reason: string) {
  const message = validateModerationReason(reason)
  if (message) throw new ApiClientError(400, 'INVALID_INPUT', message)
}

function toListingSummary(listing: ListingDetailResponse): ListingSummaryResponse {
  const thumbnail = [...listing.images].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  )[0]

  return {
    listingId: listing.listingId,
    title: listing.title,
    price: listing.price,
    status: listing.status,
    itemCondition: listing.itemCondition,
    thumbnailUrl: thumbnail?.url ?? PRODUCT_SHEET_URL,
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

function toAdminListing(listing: ListingDetailResponse): AdminListingResponse {
  const moderation = getModerationMetadata(listing.listingId)
  return {
    listingId: listing.listingId,
    title: listing.title,
    price: listing.price,
    status: listing.status,
    seller: {
      userId: listing.seller.userId,
      nickname: listing.seller.nickname,
      profileImageUrl: listing.seller.profileImageUrl,
    },
    reportCount: moderation.reportCount,
    isDeleted: moderation.isDeleted,
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
      if (!isPubliclyVisible(listing)) return false
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
      .filter((listing) => listing.isWished && isPubliclyVisible(listing))
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
    if (!listing || !isPubliclyVisible(listing)) {
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
      .filter((listing) => listing.isMine && isPubliclyVisible(listing))
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

  async getAdminListings(
    request: AdminListingSearchRequest,
  ): Promise<AdminListingPage> {
    await wait()
    const keyword = request.keyword.trim().toLocaleLowerCase('ko-KR')
    const offset = cursorToOffset(request.cursor)
    const size = request.size ?? 20
    const filtered = listings
      .filter((listing) => {
        const moderation = getModerationMetadata(listing.listingId)
        const matchesKeyword =
          !keyword || listing.title.toLocaleLowerCase('ko-KR').includes(keyword)
        const matchesSeller =
          request.sellerId === null || listing.seller.userId === request.sellerId
        const matchesStatus =
          request.status === null ||
          (request.status === 'DELETED'
            ? moderation.isDeleted
            : !moderation.isDeleted && listing.status === request.status)
        return matchesKeyword && matchesSeller && matchesStatus
      })
      .sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )
    const pageItems = filtered.slice(offset, offset + size)
    const nextOffset = offset + pageItems.length

    return {
      items: pageItems.map(toAdminListing),
      nextCursor: nextOffset < filtered.length ? btoa(String(nextOffset)) : null,
      hasNext: nextOffset < filtered.length,
    }
  },

  async changeAdminListingStatus(
    listingId: number,
    request: AdminListingStatusRequest,
  ): Promise<AdminListingStatusResponse> {
    await wait(150)
    assertValidModerationReason(request.reason)
    const listing = listings.find((item) => item.listingId === listingId)
    if (!listing) {
      throw new ApiClientError(404, 'NOT_FOUND', '상품을 찾을 수 없습니다.')
    }
    const moderation = getModerationMetadata(listingId)
    if (moderation.isDeleted) {
      throw new ApiClientError(409, 'CONFLICT', '삭제된 게시글은 변경할 수 없습니다.')
    }

    if (request.status === 'HIDDEN') {
      if (listing.status !== 'HIDDEN') {
        moderation.statusBeforeHidden = listing.status
        listing.status = 'HIDDEN'
      }
    } else {
      if (listing.status !== 'HIDDEN') {
        throw new ApiClientError(409, 'CONFLICT', '숨김 상태의 게시글만 복구할 수 있습니다.')
      }
      listing.status = moderation.statusBeforeHidden ?? 'ON_SALE'
      moderation.statusBeforeHidden = null
    }

    return { listingId, status: listing.status }
  },

  async deleteListingAsAdmin(
    listingId: number,
    request: AdminDeleteRequest,
  ): Promise<void> {
    await wait(150)
    assertValidModerationReason(request.reason)
    const listing = listings.find((item) => item.listingId === listingId)
    if (!listing) {
      throw new ApiClientError(404, 'NOT_FOUND', '상품을 찾을 수 없습니다.')
    }
    getModerationMetadata(listingId).isDeleted = true
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
    if (index < 0) {
      throw new ApiClientError(404, 'NOT_FOUND', '상품을 찾을 수 없습니다.')
    }

    const current = listings[index]
    if (!current.isMine) {
      throw new ApiClientError(403, 'FORBIDDEN', '본인의 상품만 수정할 수 있습니다.')
    }
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
    if (listing.status === 'HIDDEN' && status !== 'HIDDEN') {
      getModerationMetadata(listingId).statusBeforeHidden = status
      return
    }
    listing.status = status
  },

  reset() {
    listings = createInitialListings()
    moderationMetadata = createInitialModerationMetadata()
    nextImageId = 100
    images = createInitialImages()
  },
}
