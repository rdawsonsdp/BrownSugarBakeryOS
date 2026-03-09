export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ShiftType = 'opening' | 'mid' | 'closing'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type SOPStatus = 'draft' | 'published' | 'archived'

export interface Category {
  id: string
  slug: string
  name_en: string
  name_es: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Zone {
  id: string
  name_en: string
  name_es: string
  slug: string
  description_en: string | null
  description_es: string | null
  color: string
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Role {
  id: string
  name_en: string
  name_es: string
  slug: string
  description_en: string | null
  description_es: string | null
  is_manager: boolean
  zone_id: string
  created_at: string
}

export interface Staff {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string
  pin_hash: string
  role_id: string
  zone_id: string
  role_sequence: number | null
  preferred_language: 'en' | 'es'
  streak_count: number
  last_login_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SOP {
  id: string
  name_en: string
  name_es: string
  description_en: string | null
  description_es: string | null
  category: string
  zone_id: string
  is_critical: boolean
  status: SOPStatus
  version: number
  days_of_week: number[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SOPStep {
  id: string
  sop_id: string
  step_number: number
  title_en: string
  title_es: string
  description_en: string | null
  description_es: string | null
  image_url: string | null
  requires_photo: boolean
  estimated_minutes: number | null
  created_at: string
}

export interface TaskTemplate {
  id: string
  name_en: string
  name_es: string
  description_en: string | null
  description_es: string | null
  zone_id: string
  shift_type: ShiftType
  sop_id: string | null
  priority: number
  is_critical: boolean
  requires_photo: boolean
  estimated_minutes: number | null
  is_active: boolean
  created_at: string
}

export interface Shift {
  id: string
  staff_id: string
  zone_id: string
  shift_type: ShiftType
  shift_date: string
  started_at: string
  ended_at: string | null
  created_at: string
}

export interface TaskCompletion {
  id: string
  task_template_id: string
  shift_id: string
  staff_id: string
  status: TaskStatus
  photo_url: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  zone_id: string
  type: 'overdue' | 'critical' | 'completion' | 'alert'
  title_en: string
  title_es: string
  body_en: string | null
  body_es: string | null
  is_read: boolean
  created_at: string
}

// Extended types with joins
export interface TaskCompletionWithTemplate extends TaskCompletion {
  task_template: TaskTemplate
}

export interface SOPWithSteps extends SOP {
  sop_steps: SOPStep[]
}

export interface StaffWithRole extends Staff {
  role: Role
}

export interface ShiftWithStaff extends Shift {
  staff: Staff
}
