export const EVENTS = {
  // Session lifecycle
  SESSION_END: 'session_end',

  // Navigation
  TAB_CHANGE: 'tab_change',

  // Tasks
  TASK_COMPLETE: 'task_complete',
  TASK_UNDO: 'task_undo',

  // SOPs
  SOP_VIEW: 'sop_view',

  // Settings
  LANGUAGE_TOGGLE: 'language_toggle',

  // Shift
  SHIFT_NOTES_SAVE: 'shift_notes_save',

  // Manager Actions
  TASKS_RESET: 'tasks_reset',

  // Login
  QUICK_START_USED: 'quick_start_used',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]
