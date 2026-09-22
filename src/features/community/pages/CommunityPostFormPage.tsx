import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Send } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { communityCategoryOptions } from '@/features/community/model/labels'
import {
  useCommunityPost,
  useCreateCommunityPost,
  useUpdateCommunityPost,
} from '@/features/community/model/queries'
import type {
  CommunityCategory,
  CommunityPostWriteRequest,
} from '@/features/community/model/types'
import {
  communityLimits,
  validateCommunityContent,
  validateCommunityTitle,
} from '@/features/community/model/validation'
import { ErrorState, LoadingState } from '@/shared/components/AsyncState'
import { PageHeader } from '@/shared/components/PageHeader'
import { ApiClientError } from '@/shared/api/http'
import { useToastStore } from '@/shared/state/toastStore'

interface CommunityFormValues {
  category: CommunityCategory
  title: string
  content: string
}

interface CommunityFormErrors {
  title: string | null
  content: string | null
}

const initialValues: CommunityFormValues = {
  category: 'GENERAL',
  title: '',
  content: '',
}

const initialErrors: CommunityFormErrors = {
  title: null,
  content: null,
}

function isNotFound(error: unknown) {
  return error instanceof ApiClientError && error.status === 404
}

export function CommunityPostFormPage() {
  const params = useParams()
  const postId = params.postId ? Number(params.postId) : null
  const isEditing = postId !== null
  const hasValidPostId = postId !== null && Number.isFinite(postId) && postId > 0
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const postQuery = useCommunityPost(hasValidPostId ? postId : Number.NaN)
  const createPost = useCreateCommunityPost()
  const updatePost = useUpdateCommunityPost(postId ?? Number.NaN)
  const prefilledPostId = useRef<number | null>(null)
  const [values, setValues] = useState<CommunityFormValues>(initialValues)
  const [fieldErrors, setFieldErrors] =
    useState<CommunityFormErrors>(initialErrors)

  useEffect(() => {
    if (
      !isEditing ||
      !postQuery.data ||
      prefilledPostId.current === postQuery.data.postId
    ) {
      return
    }
    setValues({
      category: postQuery.data.category,
      title: postQuery.data.title,
      content: postQuery.data.content,
    })
    prefilledPostId.current = postQuery.data.postId
  }, [isEditing, postQuery.data])

  const isSaving = createPost.isPending || updatePost.isPending
  const saveError = createPost.error ?? updatePost.error

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = {
      title: validateCommunityTitle(values.title),
      content: validateCommunityContent(values.content),
    }
    setFieldErrors(errors)
    if (errors.title || errors.content) return

    const request: CommunityPostWriteRequest = {
      category: values.category,
      title: values.title.trim(),
      content: values.content.trim(),
    }

    if (isEditing && postId !== null) {
      updatePost.mutate(request, {
        onSuccess: () => {
          showToast('게시글을 수정했습니다.')
          navigate(`/community/${postId}`, { replace: true })
        },
      })
      return
    }

    createPost.mutate(request, {
      onSuccess: ({ postId: createdPostId }) => {
        showToast('게시글을 등록했습니다.')
        navigate(`/community/${createdPostId}`, { replace: true })
      },
    })
  }

  if (isEditing && postQuery.isLoading) {
    return (
      <div className="app-page community-form-page">
        <PageHeader title="게시글 수정" />
        <LoadingState label="게시글 정보를 불러오는 중" />
      </div>
    )
  }

  if (isEditing && (!hasValidPostId || isNotFound(postQuery.error))) {
    return (
      <div className="app-page community-form-page">
        <PageHeader title="게시글 수정" />
        <main className="form-shell community-form-shell">
          <div className="state-panel" role="alert">
            <strong>게시글을 찾을 수 없어요</strong>
            <p>삭제되었거나 존재하지 않는 게시글입니다.</p>
            <Link className="button button--secondary" to="/community">
              목록으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (isEditing && postQuery.isError) {
    return (
      <div className="app-page community-form-page">
        <PageHeader title="게시글 수정" />
        <ErrorState
          title="게시글 정보를 불러오지 못했어요"
          retry={() => void postQuery.refetch()}
        />
      </div>
    )
  }

  if (isEditing && postQuery.data && !postQuery.data.isMine) {
    return (
      <div className="app-page community-form-page">
        <PageHeader title="게시글 수정" />
        <main className="form-shell community-form-shell">
          <div className="state-panel" role="alert">
            <strong>수정 권한이 없어요</strong>
            <p>내가 작성한 게시글만 수정할 수 있습니다.</p>
            <Link
              className="button button--secondary"
              to={`/community/${postQuery.data.postId}`}
            >
              게시글로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-page community-form-page">
      <PageHeader
        title={isEditing ? '게시글 수정' : '새 게시글'}
        action={
          <button
            className="text-action"
            type="submit"
            form="community-post-form"
            disabled={isSaving}
          >
            {isEditing ? '저장' : '등록'}
          </button>
        }
      />
      <main className="form-shell community-form-shell">
        <form
          id="community-post-form"
          className="community-post-form"
          noValidate
          onSubmit={submit}
        >
          <fieldset className="community-form-section">
            <legend>카테고리</legend>
            <div className="community-category-choices">
              {communityCategoryOptions.map((option) => (
                <button
                  className={
                    values.category === option.value ? 'is-active' : undefined
                  }
                  type="button"
                  aria-pressed={values.category === option.value}
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      category: option.value,
                    }))
                  }
                  key={option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <section className="community-form-section community-form-fields">
            <label className="field">
              <span className="field__label">제목</span>
              <input
                required
                minLength={communityLimits.title.min}
                maxLength={communityLimits.title.max}
                value={values.title}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? 'community-title-error' : undefined}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="이야기의 제목을 입력해 주세요"
              />
              <span className="field__count">{values.title.length}/100</span>
              {fieldErrors.title ? (
                <span className="field-error" id="community-title-error">
                  {fieldErrors.title}
                </span>
              ) : null}
            </label>

            <label className="field">
              <span className="field__label">본문</span>
              <textarea
                required
                minLength={communityLimits.content.min}
                maxLength={communityLimits.content.max}
                rows={12}
                value={values.content}
                aria-invalid={Boolean(fieldErrors.content)}
                aria-describedby={
                  fieldErrors.content ? 'community-content-error' : undefined
                }
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="거래 경험이나 궁금한 점을 구체적으로 적어 주세요."
              />
              <span className="field__count">
                {values.content.length.toLocaleString('ko-KR')}/3,000
              </span>
              {fieldErrors.content ? (
                <span className="field-error" id="community-content-error">
                  {fieldErrors.content}
                </span>
              ) : null}
            </label>
          </section>

          {saveError ? (
            <p className="form-submit-error" role="alert">
              {saveError instanceof Error
                ? saveError.message
                : '게시글을 저장하지 못했습니다. 다시 시도해 주세요.'}
            </p>
          ) : null}

          <div className="community-form-actions">
            <Link
              className="button button--secondary"
              to={isEditing && postId ? `/community/${postId}` : '/community'}
            >
              취소
            </Link>
            <button
              className="button button--primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <LoaderCircle className="spin" size={18} aria-hidden="true" />
                  저장하는 중…
                </>
              ) : (
                <>
                  <Send size={18} aria-hidden="true" />
                  {isEditing ? '변경사항 저장' : '게시글 등록'}
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
