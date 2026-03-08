import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Locale = 'en' | 'es'

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'en' ? 'es' : 'en' }),
    }),
    { name: 'bakeryos-locale' }
  )
)
