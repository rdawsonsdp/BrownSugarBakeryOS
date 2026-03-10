import { create } from 'zustand'
import { track } from '@/lib/analytics/track'
import { EVENTS } from '@/lib/analytics/events'

type Locale = 'en' | 'es'

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

export const useLocaleStore = create<LocaleState>()((set, get) => ({
  locale: 'en',
  setLocale: (locale) => {
    track(EVENTS.LANGUAGE_TOGGLE, { to: locale })
    set({ locale })
  },
  toggleLocale: () => {
    const newLocale = get().locale === 'en' ? 'es' : 'en'
    track(EVENTS.LANGUAGE_TOGGLE, { to: newLocale })
    set({ locale: newLocale })
  },
}))
