import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductImage } from '@/features/listings/components/ProductImage'

describe('ProductImage', () => {
  it.each([null, '', '   '])('사진 URL이 %s이면 접근 가능한 대체 이미지를 표시한다', (url) => {
    render(<ProductImage listingId={101} url={url} alt="사진 없는 게시글 상품 사진" />)

    const image = screen.getByRole('img', {
      name: '사진 없는 게시글 상품 사진 없음',
    })
    expect(image).toHaveClass('product-image--placeholder')
    expect(image).toHaveTextContent('사진 없음')
    expect(screen.queryByRole('img', { name: '사진 없는 게시글 상품 사진' })).not.toBeInTheDocument()
  })

  it('일반 이미지 URL은 스프라이트로 자르지 않고 img로 표시한다', () => {
    render(
      <ProductImage
        listingId={101}
        url="https://cdn.example.com/images/marketplace-products.png?signature=valid"
        alt="실제 상품 사진"
      />,
    )

    const image = screen.getByRole('img', { name: '실제 상품 사진' })
    expect(image.tagName).toBe('IMG')
    expect(image).toHaveAttribute(
      'src',
      'https://cdn.example.com/images/marketplace-products.png?signature=valid',
    )
    expect(image).toHaveClass('product-image--asset')
    expect(image).not.toHaveClass('product-image--top-left')
  })

  it('fixture 전용 상품 시트에만 스프라이트 위치를 적용한다', () => {
    render(
      <ProductImage
        listingId={101}
        spriteIndex={2}
        url="/images/marketplace-products.png#headphones"
        alt="fixture 상품 사진"
      />,
    )

    const image = screen.getByRole('img', { name: 'fixture 상품 사진' })
    expect(image.tagName).toBe('DIV')
    expect(image).toHaveClass('product-image--sprite')
    expect(image).toHaveClass('product-image--bottom-left')
  })
})
