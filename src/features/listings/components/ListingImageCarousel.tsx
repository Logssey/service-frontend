import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProductImage } from '@/features/listings/components/ProductImage'
import type { ListingImageResponse } from '@/features/listings/model/types'

const maxCarouselImages = 5

export function ListingImageCarousel({
  listingId,
  title,
  images,
}: {
  listingId: number
  title: string
  images: ListingImageResponse[]
}) {
  const orderedImages = useMemo(
    () =>
      [...images]
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .slice(0, maxCarouselImages),
    [images],
  )
  const carouselImages = orderedImages
  const [selectedIndex, setSelectedIndex] = useState(0)
  const lastIndex = Math.max(0, carouselImages.length - 1)
  const currentIndex = Math.min(selectedIndex, lastIndex)
  const canNavigate = carouselImages.length > 1

  const showPrevious = () => {
    setSelectedIndex((current) => Math.max(0, current - 1))
  }

  const showNext = () => {
    setSelectedIndex((current) => Math.min(lastIndex, current + 1))
  }

  const currentImage = carouselImages[currentIndex]

  return (
    <section
      className="detail-media listing-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} 이미지`}
      tabIndex={canNavigate ? 0 : undefined}
      onKeyDown={(event) => {
        if (!canNavigate) return
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          showPrevious()
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          showNext()
        }
        if (event.key === 'Home') {
          event.preventDefault()
          setSelectedIndex(0)
        }
        if (event.key === 'End') {
          event.preventDefault()
          setSelectedIndex(lastIndex)
        }
      }}
    >
      <ProductImage
        className="product-image--detail"
        listingId={listingId}
        spriteIndex={canNavigate ? currentImage?.displayOrder : undefined}
        url={currentImage?.url ?? null}
        alt={currentImage ? `${title} 상품 사진 ${currentIndex + 1}` : `${title} 상품 사진`}
      />

      {canNavigate ? (
        <>
          <button
            className="carousel-button carousel-button--previous"
            type="button"
            aria-label="이전 상품 이미지"
            disabled={currentIndex === 0}
            onClick={showPrevious}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            className="carousel-button carousel-button--next"
            type="button"
            aria-label="다음 상품 이미지"
            disabled={currentIndex === lastIndex}
            onClick={showNext}
          >
            <ChevronRight aria-hidden="true" />
          </button>
          <div
            className="carousel-indicators"
            role="group"
            aria-label="상품 이미지 선택"
          >
            {carouselImages.map((image, index) => (
              <button
                className={
                  index === currentIndex
                    ? 'carousel-indicator is-active'
                    : 'carousel-indicator'
                }
                type="button"
                key={image.imageId}
                aria-label={`${index + 1}번째 상품 이미지 보기`}
                aria-current={index === currentIndex ? 'true' : undefined}
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        </>
      ) : null}

      {carouselImages.length > 0 ? (
        <span className="image-count" aria-live="polite">
          {currentIndex + 1} / {carouselImages.length}
        </span>
      ) : null}
    </section>
  )
}
