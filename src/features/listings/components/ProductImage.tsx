import type { CSSProperties } from 'react'

const productSheetPath = '/images/marketplace-products.png'
const cropClasses = [
  'product-image--top-left',
  'product-image--top-right',
  'product-image--bottom-left',
  'product-image--bottom-right',
]

function isFixtureSprite(url: string) {
  return url.split(/[?#]/, 1)[0] === productSheetPath
}

export function ProductImage({
  listingId,
  url,
  alt,
  className = '',
  spriteIndex,
}: {
  listingId: number
  url: string
  alt: string
  className?: string
  spriteIndex?: number
}) {
  if (!isFixtureSprite(url)) {
    return (
      <img
        className={`product-image product-image--asset ${className}`.trim()}
        src={url}
        alt={alt}
        decoding="async"
      />
    )
  }

  const cropSeed = spriteIndex ?? listingId - 101
  const cropIndex = Math.abs(cropSeed) % cropClasses.length
  const style = { '--product-image': `url("${url}")` } as CSSProperties

  return (
    <div
      className={`product-image product-image--sprite ${cropClasses[cropIndex]} ${className}`.trim()}
      style={style}
      role="img"
      aria-label={alt}
    />
  )
}
