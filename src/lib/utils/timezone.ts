/** Chicago timezone used for all date calculations */
const TZ = 'America/Chicago'

/** Get today's date string (YYYY-MM-DD) in Chicago time */
export function getChicagoDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Get current hour (0-23) in Chicago time */
export function getChicagoHour(date: Date = new Date()): number {
  return parseInt(date.toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }))
}
