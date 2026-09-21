import { apiRequest } from '@/shared/api/http'
import { mockListingRepository } from '@/mocks/listingRepository'
import type {
  CategoryResponse,
  ImageUploadResultResponse,
  ImageUploadUrlRequest,
  ImageUploadUrlResponse,
  ListingCreateRequest,
  ListingCreateResponse,
  ListingDetailResponse,
  ListingPage,
  ListingSearchRequest,
  ListingUpdateRequest,
} from '@/features/listings/model/types'

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

function toSearchParams(request: ListingSearchRequest) {
  const params = new URLSearchParams()
  if (request.keyword.trim()) params.set('keyword', request.keyword.trim())
  if (request.categoryId !== null) {
    params.set('categoryId', String(request.categoryId))
  }
  if (request.status !== null) params.set('status', request.status)
  if (request.minPrice !== null) params.set('minPrice', String(request.minPrice))
  if (request.maxPrice !== null) params.set('maxPrice', String(request.maxPrice))

  // 화면설계서 HOME-002에는 존재하지만 API 문서에 빠진 필드다.
  // 백엔드 계약 확정 시 이 파라미터를 정식 ListingSearchRequest에 반영한다.
  if (request.itemCondition !== null) {
    params.set('itemCondition', request.itemCondition)
  }

  params.set('sort', request.sort)
  if (request.cursor) params.set('cursor', request.cursor)
  params.set('size', String(request.size ?? 20))
  return params
}

async function uploadSingleImage(file: File) {
  const request: ImageUploadUrlRequest = {
    purpose: 'LISTING',
    fileName: file.name,
    contentType: file.type as ImageUploadUrlRequest['contentType'],
    fileSize: file.size,
  }
  const upload = await apiRequest<ImageUploadUrlResponse>('/images/upload-url', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  const uploadResponse = await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error('이미지 업로드에 실패했습니다.')
  }
  return apiRequest<ImageUploadResultResponse>(
    `/images/${upload.imageId}/complete`,
    { method: 'POST' },
  )
}

export const listingsApi = {
  async getCategories(): Promise<CategoryResponse[]> {
    if (useMocks) return mockListingRepository.getCategories()
    return apiRequest<CategoryResponse[]>('/categories')
  },

  async getListings(request: ListingSearchRequest): Promise<ListingPage> {
    if (useMocks) return mockListingRepository.getListings(request)
    return apiRequest<ListingPage>(`/listings?${toSearchParams(request)}`)
  },

  async getListing(listingId: number): Promise<ListingDetailResponse> {
    if (useMocks) return mockListingRepository.getListing(listingId)
    return apiRequest<ListingDetailResponse>(`/listings/${listingId}`)
  },

  async uploadImages(files: File[]): Promise<ImageUploadResultResponse[]> {
    if (useMocks) return mockListingRepository.uploadImages(files)
    return Promise.all(files.map(uploadSingleImage))
  },

  async createListing(
    request: ListingCreateRequest,
  ): Promise<ListingCreateResponse> {
    if (useMocks) return mockListingRepository.createListing(request)
    return apiRequest<ListingCreateResponse>('/listings', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  async updateListing(
    listingId: number,
    request: ListingUpdateRequest,
  ): Promise<ListingDetailResponse> {
    if (useMocks) return mockListingRepository.updateListing(listingId, request)
    return apiRequest<ListingDetailResponse>(`/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    })
  },
}
