import { create } from 'zustand'
import type {
  ItemCondition,
  ListingFilters,
  ListingSort,
  ListingStatus,
} from '@/features/listings/model/types'

export const initialListingFilters: ListingFilters = {
  keyword: '',
  categoryId: null,
  status: null,
  minPrice: null,
  maxPrice: null,
  itemCondition: null,
  sort: 'latest',
}

interface ListingFilterStore extends ListingFilters {
  setKeyword: (keyword: string) => void
  setCategoryId: (categoryId: number | null) => void
  setStatus: (status: ListingStatus | null) => void
  setPriceRange: (minPrice: number | null, maxPrice: number | null) => void
  setItemCondition: (itemCondition: ItemCondition | null) => void
  setSort: (sort: ListingSort) => void
  apply: (filters: ListingFilters) => void
  reset: () => void
}

export const useListingFilterStore = create<ListingFilterStore>((set) => ({
  ...initialListingFilters,
  setKeyword: (keyword) => set({ keyword }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setStatus: (status) => set({ status }),
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),
  setItemCondition: (itemCondition) => set({ itemCondition }),
  setSort: (sort) => set({ sort }),
  apply: (filters) => set(filters),
  reset: () => set(initialListingFilters),
}))
