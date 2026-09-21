import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/App'
import { listingsApi } from '@/features/listings/api/listingsApi'
import { reviewsApi } from '@/features/reviews/api/reviewsApi'
import {
  initialListingFilters,
  useListingFilterStore,
} from '@/features/listings/model/listingStore'
import { mockListingRepository } from '@/mocks/listingRepository'
import { mockChatRepository } from '@/mocks/chatRepository'
import { mockTradeRepository } from '@/mocks/tradeRepository'
import { mockReviewRepository } from '@/mocks/reviewRepository'

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('개발자 A 핵심 거래 흐름', () => {
  beforeEach(() => {
    mockListingRepository.reset()
    mockTradeRepository.reset()
    mockChatRepository.reset()
    mockReviewRepository.reset()
    useListingFilterStore.setState(initialListingFilters)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:listing-preview'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('홈에서 카테고리와 상품 목록을 불러온다', async () => {
    renderRoute('/')

    expect(
      screen.getByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '디지털기기' })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: '아이패드 프로 11형 · 키보드 포함',
      }),
    ).toBeInTheDocument()
  })

  it('검색 화면에서 카테고리 필터를 적용하고 홈 결과를 갱신한다', async () => {
    const user = userEvent.setup()
    renderRoute('/search')

    const category = await screen.findByRole('button', { name: '가구·인테리어' })
    await user.click(category)
    await user.click(screen.getByRole('button', { name: '적용하기' }))

    expect(
      await screen.findByRole('heading', { name: '빈티지 그린 데스크 램프' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          name: '아이패드 프로 11형 · 키보드 포함',
        }),
      ).not.toBeInTheDocument()
    })
  })

  it('상품 상세에서 판매 상태와 판매자 신뢰 정보를 보여준다', async () => {
    renderRoute('/listings/101')

    expect(
      await screen.findByRole('heading', {
        name: '아이패드 프로 11형 · 키보드 포함',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('판매중')).toBeInTheDocument()
    expect(screen.getByText(/거래 23회/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '거래 요청' })).toBeEnabled()
  })

  it('찜 목록에서 관심 상품을 즉시 제거한다', async () => {
    const user = userEvent.setup()
    renderRoute('/wishes')

    expect(
      await screen.findByRole('heading', { name: '입문용 미러리스 카메라' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: '입문용 미러리스 카메라 관심 해제',
      }),
    )

    expect(
      screen.queryByRole('heading', { name: '입문용 미러리스 카메라' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('관심 상품이 없습니다')).toBeInTheDocument()
  })

  it('상품 상세에서 거래를 요청하고 구매자용 상세 화면으로 이동한다', async () => {
    const user = userEvent.setup()
    renderRoute('/listings/101')

    await user.click(await screen.findByRole('button', { name: '거래 요청' }))

    expect(
      await screen.findByRole('heading', { name: '요청됨' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '거래 요청 취소' }),
    ).toBeInTheDocument()
  })

  it('판매자가 요청된 거래를 승인하면 상태와 액션이 갱신된다', async () => {
    const user = userEvent.setup()
    renderRoute('/trades/59')

    await user.click(await screen.findByRole('button', { name: '거래 승인' }))

    expect(
      await screen.findByRole('heading', { name: '거래 승인' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '거래 취소' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '거래 완료' })).not.toBeInTheDocument()
  })

  it('완료 거래의 후기를 등록하고 작성 상태를 거래 화면에 반영한다', async () => {
    const user = userEvent.setup()
    renderRoute('/trades/57')

    await user.click(await screen.findByRole('link', { name: '후기 쓰기' }))

    expect(
      await screen.findByRole('heading', { name: '거래 후기' }),
    ).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: '후기 등록' })
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '5점' }))
    await user.type(
      screen.getByRole('textbox', { name: '거래 경험' }),
      '친절하고 편안한 거래였습니다.',
    )
    await user.click(submit)

    expect(
      await screen.findByRole('heading', { name: '거래 완료' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '후기 쓰기' }),
    ).not.toBeInTheDocument()
    expect((await mockTradeRepository.getTrade(57)).reviewWritten).toBe(true)
    await expect(
      mockReviewRepository.createReview({ tradeId: 57, rating: 5 }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' })
  })

  it('완료되지 않은 거래의 후기 직접 진입과 mock 등록을 차단한다', async () => {
    renderRoute('/trades/58/review')

    expect(await screen.findByText('후기를 작성할 수 없어요')).toBeInTheDocument()
    expect(
      screen.getByText('거래가 완료된 뒤 후기를 작성할 수 있습니다.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '후기 등록' }),
    ).not.toBeInTheDocument()
    await expect(
      mockReviewRepository.createReview({ tradeId: 58, rating: 3 }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' })
  })

  it('후기 500자 제한을 지키고 등록 오류에도 입력과 별점을 유지한다', async () => {
    const user = userEvent.setup()
    const createReview = vi
      .spyOn(reviewsApi, 'createReview')
      .mockRejectedValue(new Error('이미 후기를 작성했습니다.'))
    renderRoute('/trades/57/review')

    expect(
      await screen.findByRole('heading', { name: '거래 후기' }),
    ).toBeInTheDocument()
    const content = await screen.findByRole('textbox', { name: '거래 경험' })
    const maximumContent = '가'.repeat(500)
    fireEvent.change(content, { target: { value: `${maximumContent}초과` } })
    await user.click(screen.getByRole('button', { name: '4점' }))
    await user.click(screen.getByRole('button', { name: '후기 등록' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미 후기를 작성했습니다.',
    )
    expect(content).toHaveValue(maximumContent)
    expect(screen.getByText('500 / 500')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4점' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(createReview).toHaveBeenCalledWith({
      tradeId: 57,
      rating: 4,
      content: maximumContent,
    })
  })

  it('내 게시글의 거래 지표와 상태 필터를 보여주고 cursor로 이어서 조회한다', async () => {
    const user = userEvent.setup()
    renderRoute('/me')

    expect(
      await screen.findByRole('heading', { name: '거래 활동을 한곳에서' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: '빈티지 그린 데스크 램프' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('대기 중인 거래 요청 1개'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'MY' })).toHaveClass('is-active')

    await user.click(screen.getByRole('button', { name: '거래완료' }))
    expect(
      await screen.findByRole('heading', { name: '화이트 기계식 키보드' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: '빈티지 그린 데스크 램프' }),
      ).not.toBeInTheDocument()
    })

    const firstPage = await mockListingRepository.getMySellingListings({
      status: null,
      size: 1,
    })
    const secondPage = await mockListingRepository.getMySellingListings({
      status: null,
      size: 1,
      cursor: firstPage.nextCursor,
    })
    expect(firstPage.hasNext).toBe(true)
    expect(secondPage.items[0].listingId).not.toBe(firstPage.items[0].listingId)
  })

  it('내 활동에서 판매자에게 도착한 거래 요청을 기존 거래 흐름으로 연결한다', async () => {
    const user = userEvent.setup()
    renderRoute('/me')

    await user.click(await screen.findByRole('tab', { name: '받은 요청' }))

    expect(
      await screen.findByRole('heading', { name: '빈티지 그린 데스크 램프' }),
    ).toBeInTheDocument()
    expect(screen.getByText('조명찾는사람님의 구매 요청')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /빈티지 그린 데스크 램프 상품 사진/ }),
    ).toHaveAttribute('href', '/trades/59')
  })

  it('받은 후기의 작성자·별점·선택 본문을 표시하고 cursor를 지원한다', async () => {
    renderRoute('/me?tab=reviews')

    expect(await screen.findByText('조명찾는사람')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '별점 5점' })).toBeInTheDocument()
    expect(
      screen.getByText('약속 시간을 잘 지켜 주시고 상품 설명도 정확했어요.'),
    ).toBeInTheDocument()
    expect(screen.getByText('별점만 남긴 후기입니다.')).toBeInTheDocument()

    const firstPage = await mockReviewRepository.getReceivedReviews(null, 1)
    const secondPage = await mockReviewRepository.getReceivedReviews(
      firstPage.nextCursor,
      1,
    )
    expect(firstPage.hasNext).toBe(true)
    expect(secondPage.items[0].reviewId).not.toBe(firstPage.items[0].reviewId)
  })

  it('채팅 목록에서 최근 대화와 읽지 않은 메시지를 보여준다', async () => {
    renderRoute('/chat')

    expect(await screen.findByText('좋아요. 오늘 저녁 7시에 뵐게요!')).toBeInTheDocument()
    expect(
      screen.getByLabelText('읽지 않은 메시지 2개'),
    ).toBeInTheDocument()
  })

  it('채팅방에서 메시지를 전송하고 HTTP 응답 내용을 표시한다', async () => {
    const user = userEvent.setup()
    renderRoute('/chat/12')

    const input = await screen.findByRole('textbox', { name: '메시지' })
    await user.type(input, '제품 상태 확인 감사합니다.')
    await user.click(screen.getByRole('button', { name: '메시지 보내기' }))

    expect(await screen.findByText('제품 상태 확인 감사합니다.')).toBeInTheDocument()
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('다른 사용자의 상품 상세에는 삭제 액션을 노출하지 않는다', async () => {
    renderRoute('/listings/101')

    expect(
      await screen.findByRole('heading', {
        name: '아이패드 프로 11형 · 키보드 포함',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '상품 삭제' }),
    ).not.toBeInTheDocument()
  })

  it('진행 중인 거래가 있는 내 상품은 삭제하지 않고 이유를 안내한다', async () => {
    const user = userEvent.setup()
    renderRoute('/listings/104')

    await user.click(await screen.findByRole('button', { name: '상품 삭제' }))
    expect(
      screen.getByRole('dialog', { name: '상품을 삭제할까요?' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '삭제하기' }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('진행 중인 거래가 있어 상품을 삭제할 수 없습니다.')
    expect(
      screen.getByRole('heading', { name: '빈티지 그린 데스크 램프' }),
    ).toBeInTheDocument()
  })

  it('거래가 없는 내 상품을 확인 후 삭제하고 목록으로 안전하게 이동한다', async () => {
    const user = userEvent.setup()
    const created = await mockListingRepository.createListing({
      title: '정리할 테스트 상품',
      description: '삭제 흐름을 확인하기 위한 상품입니다.',
      price: 10_000,
      itemCondition: 'USED',
      tradeMethod: 'DIRECT',
      categoryId: 1,
      imageIds: [],
    })
    renderRoute(`/listings/${created.listingId}`)

    await user.click(await screen.findByRole('button', { name: '상품 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제하기' }))

    expect(
      await screen.findByRole('heading', { name: '다시 쓰는 좋은 물건' }),
    ).toBeInTheDocument()
    await expect(
      mockListingRepository.getListing(created.listingId),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('상품 수정에서 기존 사진 제거와 신규 사진 추가 순서를 PATCH imageIds로 저장한다', async () => {
    const user = userEvent.setup()
    const [secondImage] = await mockListingRepository.uploadImages([
      new File(['second'], 'second.webp', { type: 'image/webp' }),
    ])
    await mockListingRepository.updateListing(104, {
      imageIds: [10, secondImage.imageId],
    })
    const deleteImage = vi.spyOn(listingsApi, 'deleteImage')
    const updateListing = vi.spyOn(listingsApi, 'updateListing')
    renderRoute('/listings/104/edit')

    await user.click(
      await screen.findByRole('button', { name: '1번째 사진 삭제' }),
    )
    await user.upload(
      screen.getByLabelText('사진 추가'),
      new File(['new'], 'new.png', { type: 'image/png' }),
    )
    expect(screen.getByText('2/5')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '변경사항 저장' }))

    await waitFor(() => expect(updateListing).toHaveBeenCalledTimes(1))
    expect(updateListing).toHaveBeenCalledWith(
      104,
      expect.objectContaining({ imageIds: [secondImage.imageId, 101] }),
    )
    expect(deleteImage).not.toHaveBeenCalled()
    expect(
      await screen.findByRole('heading', { name: '빈티지 그린 데스크 램프' }),
    ).toBeInTheDocument()
  })

  it('업로드 후 게시글 저장이 실패하면 미연결 VERIFIED 이미지를 정리한다', async () => {
    const user = userEvent.setup()
    vi.spyOn(listingsApi, 'uploadImages').mockResolvedValue([
      {
        imageId: 700,
        status: 'VERIFIED',
        url: '/uploaded.webp',
        thumbnailUrl: '/uploaded-thumb.webp',
      },
    ])
    vi.spyOn(listingsApi, 'createListing').mockRejectedValue(
      new Error('상품 저장에 실패했습니다.'),
    )
    const deleteImage = vi
      .spyOn(listingsApi, 'deleteImage')
      .mockResolvedValue(undefined)
    renderRoute('/listings/new')

    await user.upload(
      screen.getByLabelText('사진 추가'),
      new File(['image'], 'listing.jpg', { type: 'image/jpeg' }),
    )
    await user.type(
      screen.getByPlaceholderText('어떤 물건을 판매하시나요?'),
      '테스트 상품',
    )
    await screen.findByRole('option', { name: '디지털기기' })
    await user.selectOptions(screen.getByRole('combobox'), '1')
    await user.type(screen.getByPlaceholderText('0'), '12000')
    await user.type(
      screen.getByPlaceholderText(
        '사용 기간, 상태, 구성품 등 구매자에게 필요한 정보를 알려주세요.',
      ),
      '업로드 이미지 정리 동작을 확인합니다.',
    )
    await user.click(screen.getByRole('button', { name: '상품 등록하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '상품 저장에 실패했습니다.',
    )
    await waitFor(() => expect(deleteImage).toHaveBeenCalledWith(700))
  })
})
