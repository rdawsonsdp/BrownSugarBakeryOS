import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'h:mm a')
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatPercent(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}
