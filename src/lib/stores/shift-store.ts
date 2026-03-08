import { create } from 'zustand'

export interface TaskCompletion {
  id: string
  task_template_id: string
  shift_id: string
  staff_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  photo_url: string | null
  completed_at: string | null
  notes: string | null
  task_template?: {
    id: string
    name_en: string
    name_es: string
    description_en: string | null
    description_es: string | null
    priority: number
    is_critical: boolean
    requires_photo: boolean
    sop_id: string | null
    zone_id: string
    shift_type: 'opening' | 'mid' | 'closing'
  }
}

interface ShiftState {
  taskCompletions: TaskCompletion[]
  expandedTaskId: string | null

  setTaskCompletions: (tasks: TaskCompletion[]) => void
  updateTaskCompletion: (id: string, updates: Partial<TaskCompletion>) => void
  setExpandedTask: (id: string | null) => void
  getCompletionStats: () => { total: number; completed: number; percent: number }
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  taskCompletions: [],
  expandedTaskId: null,

  setTaskCompletions: (taskCompletions) => set({ taskCompletions }),

  updateTaskCompletion: (id, updates) =>
    set((state) => ({
      taskCompletions: state.taskCompletions.map((tc) =>
        tc.id === id ? { ...tc, ...updates } : tc
      ),
    })),

  setExpandedTask: (expandedTaskId) => set({ expandedTaskId }),

  getCompletionStats: () => {
    const tasks = get().taskCompletions
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'completed').length
    return { total, completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) }
  },
}))
