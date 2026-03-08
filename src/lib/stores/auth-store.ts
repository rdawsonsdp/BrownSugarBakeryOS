import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Staff {
  id: string
  first_name: string
  last_name: string
  display_name: string
  role_id: string
  zone_id: string
  preferred_language: 'en' | 'es'
  streak_count: number
  is_active: boolean
}

export interface Zone {
  id: string
  name_en: string
  name_es: string
  slug: string
  color: string
  icon: string
}

export interface Role {
  id: string
  name_en: string
  name_es: string
  slug: string
  is_manager: boolean
  zone_id: string
}

export interface Shift {
  id: string
  staff_id: string
  zone_id: string
  shift_type: 'opening' | 'mid' | 'closing'
  started_at: string
  ended_at: string | null
}

interface AuthState {
  staff: Staff | null
  zone: Zone | null
  role: Role | null
  shift: Shift | null
  isAuthenticated: boolean
  lastActivity: number

  login: (data: { staff: Staff; zone: Zone; role: Role; shift: Shift }) => void
  logout: () => void
  setZone: (zone: Zone) => void
  setRole: (role: Role) => void
  updateActivity: () => void
  updateShift: (shift: Shift) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      staff: null,
      zone: null,
      role: null,
      shift: null,
      isAuthenticated: false,
      lastActivity: Date.now(),

      login: ({ staff, zone, role, shift }) =>
        set({
          staff,
          zone,
          role,
          shift,
          isAuthenticated: true,
          lastActivity: Date.now(),
        }),

      logout: () =>
        set({
          staff: null,
          zone: null,
          role: null,
          shift: null,
          isAuthenticated: false,
        }),

      setZone: (zone) => set({ zone }),
      setRole: (role) => set({ role }),
      updateActivity: () => set({ lastActivity: Date.now() }),
      updateShift: (shift) => set({ shift }),
    }),
    { name: 'bakeryos-auth' }
  )
)
