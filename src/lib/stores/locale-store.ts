import { create } from 'zustand'

type Locale = 'en' | 'es'

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

export const useLocaleStore = create<LocaleState>()((set, get) => ({
  locale: 'en',
  setLocale: (locale) => set({ locale }),
  toggleLocale: () => set({ locale: get().locale === 'en' ? 'es' : 'en' }),
}))
