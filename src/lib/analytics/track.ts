import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { EventName } from './events'

const QUEUE_KEY = 'bakeryos-analytics-queue'

interface QueuedEvent {
  event_name: string
  staff_id: string | null
  zone_id: string | null
  role_id: string | null
  shift_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * Fire-and-forget analytics tracking.
 * Reads auth context from Zustand store (no prop drilling).
 * Queues events to localStorage when offline, flushes when online.
 */
export function track(eventName: EventName, metadata: Record<string, unknown> = {}) {
  const state = useAuthStore.getState()

  const event: QueuedEvent = {
    event_name: eventName,
    staff_id: state.staff?.id ?? null,
    zone_id: state.zone?.id ?? null,
    role_id: state.role?.id ?? null,
    shift_id: state.shift?.id ?? null,
    metadata,
    created_at: new Date().toISOString(),
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueEvent(event)
    return
  }

  insertEvent(event).catch(() => queueEvent(event))
}

async function insertEvent(event: QueuedEvent) {
  const supabase = createClient()
  await supabase.from('analytics_events').insert(event)
}

function queueEvent(event: QueuedEvent) {
  try {
    const queue = getQueue()
    queue.push(event)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // localStorage may be unavailable
  }
}

function getQueue(): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Flush queued events when back online.
 * Called from useTrackSession hook.
 */
export async function flushQueue() {
  const queue = getQueue()
  if (queue.length === 0) return

  localStorage.removeItem(QUEUE_KEY)

  const supabase = createClient()
  const { error } = await supabase.from('analytics_events').insert(queue)

  if (error) {
    // Re-queue on failure
    try {
      const existing = getQueue()
      localStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, ...queue]))
    } catch {
      // give up
    }
  }
}
