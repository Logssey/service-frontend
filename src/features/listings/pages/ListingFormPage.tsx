import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus, LoaderCircle, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { listingsApi } from '@/features/listings/api/listingsApi'
import { ProductImage } from '@/features/listings/components/ProductImage'
import { listingKeys, useCategories, useListing } from '@/features/listings/model/queries'
import type {
  ItemCondition,
  ListingCreateRequest,
  ListingImageResponse,
  ListingUpdateRequest,
  TradeMethod,
} from '@/features/listings/model/types'
import { LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToastStore } from '@/shared/state/toastStore'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxImageSize = 10 * 1024 * 1024
const maxImageCount = 5

async function cleanupVerifiedImages(imageIds: number[]) {
  await Promise.allSettled(
    imageIds.map((imageId) => listingsApi.deleteImage(imageId)),
  )
}

interface SelectedImage {
  file: File
  previewUrl: string
}

interface FormValues {
  title: string
  categoryId: number | ''
  price: string
  itemCondition: ItemCondition
  tradeMethod: TradeMethod
  description: string
}

const initialValues: FormValues = {
  title: '',
  categoryId: '',
  price: '',
  itemCondition: 'LIKE_NEW',
  tradeMethod: 'BOTH',
  description: '',
}

const conditionOptions: Array<{ value: ItemCondition; label: string }> = [
  { value: 'NEW', label: '새상품' },
  { value: 'LIKE_NEW', label: '거의 새것' },
  { value: 'USED', label: '중고' },
  { value: 'DAMAGED', label: '하자 있음' },
]

const tradeOptions: Array<{
  value: TradeMethod
  label: string
  description: string
}> = [
  { value: 'DIRECT', label: '직거래', description: '만나서 직접 거래해요' },
  { value: 'DELIVERY', label: '택배거래', description: '택배로 주고받아요' },
  { value: 'BOTH', label: '둘 다 가능', description: '상대방과 방법을 정해요' },
]

export function ListingFormPage() {
  const params = useParams()
  const listingId = params.listingId ? Number(params.listingId) : null
  const isEditing = listingId !== null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const categoriesQuery = useCategories()
  const listingQuery = useListing(listingId ?? Number.NaN)
  const prefilled = useRef(false)
  const selectedImagesRef = useRef<SelectedImage[]>([])
  const pendingImageIdsRef = useRef<number[]>([])
  const isAttachingImagesRef = useRef(false)
  const isMountedRef = useRef(true)
  const [values, setValues] = useState<FormValues>(initialValues)
  const [retainedImages, setRetainedImages] = useState<ListingImageResponse[]>([])
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const imageCount = retainedImages.length + selectedImages.length

  useEffect(() => {
    selectedImagesRef.current = selectedImages
  }, [selectedImages])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      if (!isAttachingImagesRef.current && pendingImageIdsRef.current.length > 0) {
        const orphanImageIds = [...pendingImageIdsRef.current]
        pendingImageIdsRef.current = []
        void cleanupVerifiedImages(orphanImageIds)
      }
    }
  }, [])

  useEffect(() => {
    if (!isEditing || !listingQuery.data || prefilled.current) return
    const listing = listingQuery.data
    setValues({
      title: listing.title,
      categoryId: listing.category.categoryId,
      price: String(listing.price),
      itemCondition: listing.itemCondition,
      tradeMethod: listing.tradeMethod,
      description: listing.description,
    })
    setRetainedImages(
      [...listing.images].sort(
        (left, right) => left.displayOrder - right.displayOrder,
      ),
    )
    prefilled.current = true
  }, [isEditing, listingQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      try {
        const uploaded = selectedImages.length
          ? await listingsApi.uploadImages(selectedImages.map((image) => image.file))
          : []
        const verifiedImageIds = uploaded
          .filter((image) => image.status === 'VERIFIED')
          .map((image) => image.imageId)
        pendingImageIdsRef.current = verifiedImageIds

        if (uploaded.some((image) => image.status !== 'VERIFIED')) {
          throw new Error('검증을 통과하지 못한 사진이 있습니다. 다른 사진을 선택해 주세요.')
        }
        if (!isMountedRef.current) {
          throw new Error('상품 저장이 취소되었습니다.')
        }

        const request: ListingCreateRequest = {
          title: values.title.trim(),
          description: values.description.trim(),
          price: Number(values.price),
          itemCondition: values.itemCondition,
          tradeMethod: values.tradeMethod,
          categoryId: Number(values.categoryId),
          imageIds: [
            ...retainedImages.map((image) => image.imageId),
            ...verifiedImageIds,
          ],
        }

        isAttachingImagesRef.current = true
        if (listingId !== null) {
          const updateRequest: ListingUpdateRequest = { ...request }
          const response = await listingsApi.updateListing(listingId, updateRequest)
          pendingImageIdsRef.current = []
          return { listingId: response.listingId }
        }
        const response = await listingsApi.createListing(request)
        pendingImageIdsRef.current = []
        return response
      } catch (error) {
        const orphanImageIds = [...pendingImageIdsRef.current]
        pendingImageIdsRef.current = []
        if (orphanImageIds.length > 0) {
          await cleanupVerifiedImages(orphanImageIds)
        }
        throw error
      } finally {
        isAttachingImagesRef.current = false
      }
    },
    onSuccess: async ({ listingId: savedListingId }) => {
      await queryClient.invalidateQueries({ queryKey: listingKeys.all })
      showToast(isEditing ? '상품 정보를 수정했습니다.' : '상품을 등록했습니다.')
      navigate(`/listings/${savedListingId}`, { replace: true })
    },
  })

  const addImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setImageError(null)

    if (imageCount + files.length > maxImageCount) {
      setImageError('상품 사진은 최대 5장까지 등록할 수 있어요.')
      return
    }
    const invalidType = files.find((file) => !allowedTypes.has(file.type))
    if (invalidType) {
      setImageError('JPEG, PNG, WebP 형식만 등록할 수 있어요.')
      return
    }
    const oversized = files.find((file) => file.size > maxImageSize)
    if (oversized) {
      setImageError('사진 한 장의 크기는 10MB 이하여야 해요.')
      return
    }

    setSelectedImages((current) => [
      ...current,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ])
  }

  const removeImage = (index: number) => {
    setImageError(null)
    setSelectedImages((current) => {
      const target = current[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((_, imageIndex) => imageIndex !== index)
    })
  }

  const removeExistingImage = (imageId: number) => {
    setImageError(null)
    setRetainedImages((current) =>
      current.filter((image) => image.imageId !== imageId),
    )
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!values.categoryId) {
      showToast('카테고리를 선택해 주세요.')
      return
    }
    saveMutation.mutate()
  }

  if (isEditing && listingQuery.isLoading) {
    return (
      <div className="app-page">
        <PageHeader title="상품 수정" />
        <LoadingState label="상품 정보를 불러오는 중" />
      </div>
    )
  }

  return (
    <div className="app-page listing-form-page">
      <PageHeader
        title={isEditing ? '상품 수정' : '상품 등록'}
        action={
          <button
            className="text-action"
            type="submit"
            form="listing-form"
            disabled={saveMutation.isPending}
          >
            {isEditing ? '저장' : '등록'}
          </button>
        }
      />

      <main className="form-shell form-shell--listing">
        <form id="listing-form" className="listing-form" onSubmit={submit}>
          <section className="form-section image-uploader" aria-labelledby="photo-label">
            <div className="field-heading">
              <h2 id="photo-label">사진</h2>
              <span>{imageCount}/{maxImageCount}</span>
            </div>
            <p className="field-help">첫 번째 사진이 상품 목록의 대표 이미지가 됩니다.</p>
            <div className="image-preview-list">
              {retainedImages.map((image, index) => (
                <div className="image-preview image-preview--existing" key={image.imageId}>
                  <ProductImage
                    listingId={listingId ?? 0}
                    url={image.url}
                    alt={`현재 상품 사진 ${index + 1}`}
                  />
                  {index === 0 ? <span>대표</span> : null}
                  <button
                    type="button"
                    onClick={() => removeExistingImage(image.imageId)}
                    aria-label={`${index + 1}번째 사진 삭제`}
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {selectedImages.map((image, index) => (
                <div className="image-preview" key={`${image.file.name}-${index}`}>
                  <img
                    src={image.previewUrl}
                    alt={`선택한 상품 사진 ${retainedImages.length + index + 1}`}
                  />
                  {retainedImages.length + index === 0 ? <span>대표</span> : null}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`${retainedImages.length + index + 1}번째 사진 삭제`}
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {imageCount < maxImageCount ? (
                <label className="image-add-button">
                  <ImagePlus aria-hidden="true" />
                  <span>사진 추가</span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={addImages}
                  />
                </label>
              ) : null}
            </div>
            {imageError ? <p className="field-error">{imageError}</p> : null}
            <p className="field-caption">JPEG · PNG · WebP / 장당 최대 10MB</p>
          </section>

          <section className="form-section form-fields">
            <label className="field">
              <span className="field__label">제목</span>
              <input
                required
                minLength={2}
                maxLength={100}
                value={values.title}
                onChange={(event) =>
                  setValues((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="어떤 물건을 판매하시나요?"
              />
              <span className="field__count">{values.title.length}/100</span>
            </label>

            <label className="field">
              <span className="field__label">카테고리</span>
              <select
                required
                value={values.categoryId}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    categoryId: event.target.value ? Number(event.target.value) : '',
                  }))
                }
              >
                <option value="">선택해 주세요</option>
                {categoriesQuery.data?.map((category) => (
                  <option value={category.categoryId} key={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">가격</span>
              <span className="field__with-unit">
                <input
                  required
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100000000"
                  value={values.price}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="0"
                />
                <span>원</span>
              </span>
            </label>
          </section>

          <section className="form-section" aria-labelledby="item-condition-label">
            <h2 id="item-condition-label">상품 상태</h2>
            <div className="choice-grid">
              {conditionOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={
                    values.itemCondition === option.value ? 'choice is-active' : 'choice'
                  }
                  aria-pressed={values.itemCondition === option.value}
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      itemCondition: option.value,
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <fieldset className="form-section trade-methods">
            <legend>거래 방식</legend>
            <div className="trade-method-grid">
              {tradeOptions.map((option) => (
                <label
                  className={
                    values.tradeMethod === option.value
                      ? 'trade-method is-active'
                      : 'trade-method'
                  }
                  key={option.value}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="tradeMethod"
                    value={option.value}
                    checked={values.tradeMethod === option.value}
                    onChange={() =>
                      setValues((current) => ({
                        ...current,
                        tradeMethod: option.value,
                      }))
                    }
                  />
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <section className="form-section">
            <label className="field">
              <span className="field__label">상품 설명</span>
              <textarea
                required
                maxLength={2000}
                rows={7}
                value={values.description}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="사용 기간, 상태, 구성품 등 구매자에게 필요한 정보를 알려주세요."
              />
              <span className="field__count">{values.description.length}/2,000</span>
            </label>
          </section>

          {saveMutation.isError ? (
            <p className="form-submit-error" role="alert">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : '등록 중 문제가 생겼습니다. 입력 내용을 확인하고 다시 시도해 주세요.'}
            </p>
          ) : null}

          <div className="listing-form-submit">
            <button
              className="button button--primary"
              type="submit"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <LoaderCircle className="spin" size={19} aria-hidden="true" />
                  저장하는 중…
                </>
              ) : (
                <>
                  <Camera size={19} aria-hidden="true" />
                  {isEditing ? '변경사항 저장' : '상품 등록하기'}
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
