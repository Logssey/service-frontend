import { create } from 'zustand'

interface ToastStore {
  message: string | null
  show: (message: string) => void
  dismiss: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  show: (message) => set({ message }),
  dismiss: () => set({ message: null }),
}))
