import type { CSSProperties } from 'react'

const cropClasses = [
  'product-image--top-left',
  'product-image--top-right',
  'product-image--bottom-left',
  'product-image--bottom-right',
]

export function ProductImage({
  listingId,
  url,
  alt,
  className = '',
}: {
  listingId: number
  url: string
  alt: string
  className?: string
}) {
  const cropIndex = Math.abs(listingId - 101) % cropClasses.length
  const style = { '--product-image': `url("${url}")` } as CSSProperties

  return (
    <div
      className={`product-image ${cropClasses[cropIndex]} ${className}`}
      style={style}
      role="img"
      aria-label={alt}
    />
  )
}
