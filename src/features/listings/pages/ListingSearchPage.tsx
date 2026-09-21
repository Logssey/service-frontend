import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  initialListingFilters,
  useListingFilterStore,
} from '@/features/listings/model/listingStore'
import { useCategories } from '@/features/listings/model/queries'
import type {
  ItemCondition,
  ListingFilters,
  ListingSort,
} from '@/features/listings/model/types'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToastStore } from '@/shared/state/toastStore'

const conditions: Array<{ value: ItemCondition; label: string }> = [
  { value: 'NEW', label: '새상품' },
  { value: 'LIKE_NEW', label: '거의 새것' },
  { value: 'USED', label: '중고' },
  { value: 'DAMAGED', label: '하자 있음' },
]

const sortOptions: Array<{ value: ListingSort; label: string }> = [
  { value: 'latest', label: '최신순' },
  { value: 'priceAsc', label: '낮은 가격순' },
  { value: 'priceDesc', label: '높은 가격순' },
]

export function ListingSearchPage() {
  const navigate = useNavigate()
  const store = useListingFilterStore()
  const showToast = useToastStore((state) => state.show)
  const categoriesQuery = useCategories()
  const [draft, setDraft] = useState<ListingFilters>({
    keyword: store.keyword,
    categoryId: store.categoryId,
    status: store.status,
    minPrice: store.minPrice,
    maxPrice: store.maxPrice,
    itemCondition: store.itemCondition,
    sort: store.sort,
  })

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      draft.minPrice !== null &&
      draft.maxPrice !== null &&
      draft.minPrice > draft.maxPrice
    ) {
      showToast('최소 가격은 최대 가격보다 클 수 없습니다.')
      return
    }
    store.apply(draft)
    navigate('/')
  }

  const reset = () => {
    setDraft(initialListingFilters)
    store.reset()
  }

  return (
    <div className="app-page search-page">
      <PageHeader title="검색 · 필터" />
      <main className="form-shell">
        <form className="filter-form" onSubmit={applyFilters}>
          <section className="form-section">
            <label className="search-input">
              <Search size={20} aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={draft.keyword}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, keyword: event.target.value }))
                }
                placeholder="찾는 상품을 입력하세요"
                maxLength={50}
              />
              {draft.keyword ? (
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({ ...current, keyword: '' }))
                  }
                  aria-label="검색어 지우기"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              ) : null}
            </label>
          </section>

          <section className="form-section" aria-labelledby="category-label">
            <h2 id="category-label">카테고리</h2>
            <div className="choice-grid choice-grid--categories">
              <button
                type="button"
                className={draft.categoryId === null ? 'choice is-active' : 'choice'}
                onClick={() =>
                  setDraft((current) => ({ ...current, categoryId: null }))
                }
              >
                전체
              </button>
              {categoriesQuery.data?.map((category) => (
                <button
                  type="button"
                  key={category.categoryId}
                  className={
                    draft.categoryId === category.categoryId
                      ? 'choice is-active'
                      : 'choice'
                  }
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      categoryId: category.categoryId,
                    }))
                  }
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          <section className="form-section" aria-labelledby="price-label">
            <h2 id="price-label">가격 범위</h2>
            <div className="price-range">
              <label>
                <span className="sr-only">최소 가격</span>
                <input
                  inputMode="numeric"
                  type="number"
                  min="0"
                  max="100000000"
                  placeholder="최소"
                  value={draft.minPrice ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      minPrice: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                />
                <span>원</span>
              </label>
              <span>–</span>
              <label>
                <span className="sr-only">최대 가격</span>
                <input
                  inputMode="numeric"
                  type="number"
                  min="0"
                  max="100000000"
                  placeholder="최대"
                  value={draft.maxPrice ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      maxPrice: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                />
                <span>원</span>
              </label>
            </div>
          </section>

          <section className="form-section" aria-labelledby="condition-label">
            <h2 id="condition-label">상품 상태</h2>
            <div className="choice-grid">
              {conditions.map((condition) => (
                <button
                  type="button"
                  key={condition.value}
                  className={
                    draft.itemCondition === condition.value
                      ? 'choice is-active'
                      : 'choice'
                  }
                  aria-pressed={draft.itemCondition === condition.value}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      itemCondition:
                        current.itemCondition === condition.value
                          ? null
                          : condition.value,
                    }))
                  }
                >
                  {condition.label}
                </button>
              ))}
            </div>
          </section>

          <section className="form-section" aria-labelledby="sort-label">
            <h2 id="sort-label">정렬</h2>
            <div className="choice-grid">
              {sortOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={draft.sort === option.value ? 'choice is-active' : 'choice'}
                  aria-pressed={draft.sort === option.value}
                  onClick={() =>
                    setDraft((current) => ({ ...current, sort: option.value }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <div className="sticky-form-actions">
            <button className="button button--secondary" type="button" onClick={reset}>
              초기화
            </button>
            <button className="button button--primary" type="submit">
              적용하기
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
