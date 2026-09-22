import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '@/app/App'
import { communityApi } from '@/features/community/api/communityApi'
import { mockCommunityRepository } from '@/mocks/communityRepository'

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

describe('커뮤니티 게시판', () => {
  beforeEach(() => mockCommunityRepository.reset())

  afterEach(() => vi.restoreAllMocks())

  it('하단 커뮤니티 링크를 활성화하고 카테고리와 cursor로 목록을 탐색한다', async () => {
    const user = userEvent.setup()
    renderRoute('/community')

    expect(
      await screen.findByRole('heading', { name: '커뮤니티 게시판' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '커뮤니티' })).toHaveClass(
      'is-active',
    )
    expect(screen.getByRole('link', { name: '커뮤니티' })).toHaveAttribute(
      'href',
      '/community',
    )
    expect(screen.queryByRole('button', { name: '알림' })).not.toBeInTheDocument()
    expect(await screen.findByText('불러온 글 5개')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '게시글 더 보기' }))
    expect(
      await screen.findByRole('heading', {
        name: '직거래 약속 시간, 이렇게 정하니 편했어요',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('불러온 글 7개')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '질문' }))
    expect(
      await screen.findByRole('heading', {
        name: '택배 거래할 때 포장 팁이 있을까요?',
      }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          name: '직거래 전에 확인하면 좋은 세 가지',
        }),
      ).not.toBeInTheDocument()
    })
  })

  it('상세와 댓글을 표시하고 없는 게시글은 404 상태로 안내한다', async () => {
    renderRoute('/community/205')

    expect(
      await screen.findByRole('heading', {
        name: '우리 동네 직거래 장소를 추천해요',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/역 2번 출구 앞 안내 데스크/)).toBeInTheDocument()
    expect(await screen.findByText(/주말에도 안내 데스크/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '커뮤니티' })).toHaveClass(
      'is-active',
    )

    cleanup()
    renderRoute('/community/999')
    expect(
      await screen.findByText('게시글을 찾을 수 없어요'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '목록으로 돌아가기' }),
    ).toHaveAttribute('href', '/community')
  })

  it('목록과 상세의 로딩·빈 상태·조회 오류를 안내한다', async () => {
    const getPosts = vi.spyOn(communityApi, 'getPosts').mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      hasNext: false,
    })
    renderRoute('/community')

    expect(screen.getByRole('status')).toHaveTextContent(
      '커뮤니티 글을 불러오는 중',
    )
    expect(
      await screen.findByText('이 카테고리에는 아직 글이 없어요'),
    ).toBeInTheDocument()

    cleanup()
    getPosts.mockRejectedValueOnce(new Error('목록 조회 실패'))
    renderRoute('/community')
    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('커뮤니티 글을 불러오지 못했어요')

    cleanup()
    vi.spyOn(communityApi, 'getPost').mockRejectedValueOnce(
      new Error('상세 조회 실패'),
    )
    renderRoute('/community/205')
    expect(screen.getByRole('status')).toHaveTextContent(
      '게시글을 불러오는 중',
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '게시글을 불러오지 못했어요',
    )
  })

  it('등록 오류에도 입력을 보존하고 다시 제출해 게시글을 만든다', async () => {
    const user = userEvent.setup()
    vi.spyOn(communityApi, 'createPost').mockRejectedValueOnce(
      new Error('잠시 후 다시 등록해 주세요.'),
    )
    renderRoute('/community/new')

    const title = screen.getByRole('textbox', { name: '제목' })
    const content = screen.getByRole('textbox', { name: '본문' })
    expect(title).toHaveAttribute('minlength', '2')
    expect(title).toHaveAttribute('maxlength', '100')
    expect(content).toHaveAttribute('minlength', '10')
    expect(content).toHaveAttribute('maxlength', '3000')

    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    expect(screen.getByText(/제목은 2자 이상/)).toBeInTheDocument()
    expect(screen.getByText(/본문은 10자 이상/)).toBeInTheDocument()

    await user.type(title, '안전한 직거래 장소를 공유해요')
    await user.type(
      content,
      '사람이 많고 밝은 장소에서 거래하니 서로 안심할 수 있었습니다.',
    )
    await user.click(screen.getByRole('button', { name: '거래 팁' }))
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '잠시 후 다시 등록해 주세요.',
    )
    expect(title).toHaveValue('안전한 직거래 장소를 공유해요')
    expect(content).toHaveValue(
      '사람이 많고 밝은 장소에서 거래하니 서로 안심할 수 있었습니다.',
    )

    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    expect(
      await screen.findByRole('heading', {
        name: '안전한 직거래 장소를 공유해요',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('거래 팁')).toBeInTheDocument()
  })

  it('본인 게시글을 수정한 뒤 확인을 거쳐 삭제한다', async () => {
    const user = userEvent.setup()
    renderRoute('/community/205/edit')

    const title = await screen.findByRole('textbox', { name: '제목' })
    expect(title).toHaveValue('우리 동네 직거래 장소를 추천해요')
    await user.clear(title)
    await user.type(title, '우리 동네 직거래 장소 정보')
    await user.click(screen.getByRole('button', { name: '변경사항 저장' }))

    expect(
      await screen.findByRole('heading', {
        name: '우리 동네 직거래 장소 정보',
      }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '삭제' }))
    const dialog = screen.getByRole('region', {
      name: '게시글을 삭제할까요?',
    })
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }))

    expect(
      await screen.findByRole('heading', { name: '커뮤니티 게시판' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: '우리 동네 직거래 장소 정보',
      }),
    ).not.toBeInTheDocument()
  })

  it('댓글 등록 오류에는 초안을 보존하고 등록·삭제 후 최신 목록을 갱신한다', async () => {
    const user = userEvent.setup()
    vi.spyOn(communityApi, 'createComment').mockRejectedValueOnce(
      new Error('댓글을 등록하지 못했습니다.'),
    )
    renderRoute('/community/205')

    const comment = await screen.findByRole('textbox', { name: '댓글' })
    expect(comment).toHaveAttribute('maxlength', '500')
    await user.type(comment, '저녁에도 밝아서 만나기 좋았습니다.')
    await user.click(screen.getByRole('button', { name: '댓글 등록' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '댓글을 등록하지 못했습니다.',
    )
    expect(comment).toHaveValue('저녁에도 밝아서 만나기 좋았습니다.')

    await user.click(screen.getByRole('button', { name: '댓글 등록' }))
    const createdContent = await screen.findByText(
      '저녁에도 밝아서 만나기 좋았습니다.',
      { selector: '.community-comment p' },
    )
    await waitFor(() => expect(comment).toHaveValue(''))
    const createdComment = createdContent.closest('li')
    expect(createdComment).not.toBeNull()
    await user.click(
      within(createdComment as HTMLElement).getByRole('button', {
        name: '다시쓰는사람 댓글 삭제',
      }),
    )
    await waitFor(() => {
      expect(
        screen.queryByText('저녁에도 밝아서 만나기 좋았습니다.'),
      ).not.toBeInTheDocument()
    })
  })

  it('다른 사용자의 글과 댓글 변경을 차단하고 모든 글자 수 제한을 검증한다', async () => {
    const validPost = {
      category: 'GENERAL' as const,
      title: '유효한 제목',
      content: '열 글자를 넘는 유효한 게시글 본문입니다.',
    }

    await expect(
      mockCommunityRepository.updatePost(207, validPost),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    await expect(mockCommunityRepository.deletePost(207)).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
    await expect(
      mockCommunityRepository.deleteComment(205, 502),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    await expect(
      mockCommunityRepository.createPost({ ...validPost, title: '한' }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' })
    await expect(
      mockCommunityRepository.createPost({ ...validPost, content: '아홉글자미만' }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' })
    await expect(
      mockCommunityRepository.createComment(205, {
        content: '댓'.repeat(501),
      }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' })
  })

  it('다른 사용자의 수정 화면 직접 진입을 차단한다', async () => {
    renderRoute('/community/207/edit')

    expect(await screen.findByText('수정 권한이 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: '제목' })).not.toBeInTheDocument()
  })

  it('입력 요소가 최대 길이를 넘어도 저장 요청 전에 검증한다', async () => {
    const createPost = vi.spyOn(communityApi, 'createPost')
    renderRoute('/community/new')

    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '제'.repeat(101) },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '본문' }), {
      target: { value: '본'.repeat(3_001) },
    })
    fireEvent.click(screen.getByRole('button', { name: '게시글 등록' }))

    expect(screen.getByText(/제목은 2자 이상 100자 이하/)).toBeInTheDocument()
    expect(screen.getByText(/본문은 10자 이상 3,000자 이하/)).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })
})
