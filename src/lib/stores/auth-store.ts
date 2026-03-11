import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { track } from '@/lib/analytics/track'
import { EVENTS } from '@/lib/analytics/events'

export interface Staff {
  id: string
  first_name: string
  last_name: string
  display_name: string
  role_id: string | null
  zone_id: string | null
  preferred_language: 'en' | 'es'
  streak_count: number
  is_active: boolean
  phone?: string | null
  email?: string | null
  role?: Role | null
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
  sort_order?: number
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
  // Pre-auth selection
  loginMode: 'name' | null
  selectedStaffId: string | null
  selectedStaff: Staff | null

  // Authenticated state
  staff: Staff | null
  zone: Zone | null
  role: Role | null
  shift: Shift | null
  isAuthenticated: boolean
  lastActivity: number

  // Actions
  selectByName: (staff: Staff) => void
  setVerifiedStaff: (staff: Staff) => void
  setZone: (zone: Zone) => void
  setRole: (role: Role) => void
  setShift: (shift: Shift) => void
  login: (data: { staff: Staff; zone: Zone; role: Role; shift: Shift }) => void
  logout: () => void
  updateActivity: () => void
  updateShift: (shift: Shift) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      loginMode: null,
      selectedStaffId: null,
      selectedStaff: null,
      staff: null,
      zone: null,
      role: null,
      shift: null,
      isAuthenticated: false,
      lastActivity: Date.now(),

      selectByName: (staff) =>
        set({ loginMode: 'name', selectedStaffId: staff.id, selectedStaff: staff }),

      setVerifiedStaff: (staff) =>
        set({ selectedStaff: staff, selectedStaffId: staff.id }),

      setZone: (zone) => set({ zone }),
      setRole: (role) => set({ role }),
      setShift: (shift) => set({ shift }),

      login: ({ staff, zone, role, shift }) =>
        set({
          staff,
          zone,
          role,
          shift,
          loginMode: null,
          selectedStaffId: null,
          selectedStaff: null,
          isAuthenticated: true,
          lastActivity: Date.now(),
        }),

      logout: () => {
        track(EVENTS.SESSION_END)
        set({
          loginMode: null,
          selectedStaffId: null,
          selectedStaff: null,
          staff: null,
          zone: null,
          role: null,
          shift: null,
          isAuthenticated: false,
        })
      },

      updateActivity: () => set({ lastActivity: Date.now() }),
      updateShift: (shift) => set({ shift }),
    }),
    {
      name: 'bakeryos-auth',
      version: 2,
      partialize: (state) => ({
        staff: state.staff,
        zone: state.zone,
        role: state.role,
        shift: state.shift,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
    }
  )
)
