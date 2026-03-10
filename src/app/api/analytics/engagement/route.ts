import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SessionStat {
  date: string
  sessions: number
  avg_duration_minutes: number
}

interface FeatureUsage {
  tab: string
  count: number
}

interface HourBucket {
  hour: number
  count: number
}

interface StaffEngagement {
  staff_id: string
  display_name: string
  sessions: number
  total_minutes: number
  events: number
}

interface EngagementResponse {
  sessions: SessionStat[]
  featureUsage: FeatureUsage[]
  peakHours: HourBucket[]
  staffEngagement: StaffEngagement[]
  sopViewRate: number
  summary: {
    total_sessions: number
    avg_session_minutes: number
    total_events: number
    active_staff: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')
    const days = Math.min(Math.max(parseInt(daysParam || '7', 10) || 7, 1), 90)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString()

    // 1. Sessions per day with durations from login_sessions
    const { data: loginSessions } = await supabase
      .from('login_sessions')
      .select('id, staff_id, logged_in_at, logged_out_at')
      .gte('logged_in_at', startDateStr)
      .order('logged_in_at', { ascending: true })

    const typedSessions = (loginSessions ?? []) as {
      id: string
      staff_id: string
      logged_in_at: string
      logged_out_at: string | null
    }[]

    // Group sessions by date
    const sessionsByDate = new Map<string, { count: number; totalMinutes: number }>()
    let totalDurationMinutes = 0
    let sessionsWithDuration = 0

    for (const s of typedSessions) {
      const date = s.logged_in_at.split('T')[0]
      const entry = sessionsByDate.get(date) ?? { count: 0, totalMinutes: 0 }
      entry.count++

      if (s.logged_out_at) {
        const duration = (new Date(s.logged_out_at).getTime() - new Date(s.logged_in_at).getTime()) / 60000
        if (duration > 0 && duration < 720) { // Cap at 12 hours to filter outliers
          entry.totalMinutes += duration
          totalDurationMinutes += duration
          sessionsWithDuration++
        }
      }

      sessionsByDate.set(date, entry)
    }

    const sessions: SessionStat[] = Array.from(sessionsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        sessions: stats.count,
        avg_duration_minutes: stats.count > 0 ? Math.round(stats.totalMinutes / stats.count) : 0,
      }))

    // 2. Analytics events
    const { data: events } = await supabase
      .from('analytics_events')
      .select('event_name, staff_id, metadata, created_at')
      .gte('created_at', startDateStr)

    const typedEvents = (events ?? []) as {
      event_name: string
      staff_id: string | null
      metadata: Record<string, unknown>
      created_at: string
    }[]

    // 3. Feature usage from tab_change events
    const tabCounts = new Map<string, number>()
    for (const e of typedEvents) {
      if (e.event_name === 'tab_change' && e.metadata?.to) {
        const tab = String(e.metadata.to)
        tabCounts.set(tab, (tabCounts.get(tab) ?? 0) + 1)
      }
    }

    const featureUsage: FeatureUsage[] = Array.from(tabCounts.entries())
      .map(([tab, count]) => ({ tab, count }))
      .sort((a, b) => b.count - a.count)

    // 4. Peak hours from login_sessions
    const hourCounts = new Array(24).fill(0) as number[]
    for (const s of typedSessions) {
      const hour = new Date(s.logged_in_at).getHours()
      hourCounts[hour]++
    }

    const peakHours: HourBucket[] = hourCounts.map((count, hour) => ({ hour, count }))

    // 5. SOP view rate: sop_view events / task_complete events
    const sopViews = typedEvents.filter((e) => e.event_name === 'sop_view').length
    const taskCompletes = typedEvents.filter((e) => e.event_name === 'task_complete').length
    const sopViewRate = taskCompletes > 0 ? Math.round((sopViews / taskCompletes) * 100) : 0

    // 6. Staff engagement
    const staffEvents = new Map<string, { events: number }>()
    for (const e of typedEvents) {
      if (!e.staff_id) continue
      const entry = staffEvents.get(e.staff_id) ?? { events: 0 }
      entry.events++
      staffEvents.set(e.staff_id, entry)
    }

    // Get staff names
    const allStaffIds = [...new Set([
      ...typedSessions.map((s) => s.staff_id),
      ...typedEvents.map((e) => e.staff_id).filter(Boolean) as string[],
    ])]

    let staffMap = new Map<string, string>()
    if (allStaffIds.length > 0) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, display_name')
        .in('id', allStaffIds)
      for (const s of (staffData ?? []) as { id: string; display_name: string }[]) {
        staffMap.set(s.id, s.display_name)
      }
    }

    // Combine session and event data per staff
    const staffSessionMap = new Map<string, { sessions: number; totalMinutes: number }>()
    for (const s of typedSessions) {
      const entry = staffSessionMap.get(s.staff_id) ?? { sessions: 0, totalMinutes: 0 }
      entry.sessions++
      if (s.logged_out_at) {
        const duration = (new Date(s.logged_out_at).getTime() - new Date(s.logged_in_at).getTime()) / 60000
        if (duration > 0 && duration < 720) {
          entry.totalMinutes += duration
        }
      }
      staffSessionMap.set(s.staff_id, entry)
    }

    const staffEngagement: StaffEngagement[] = allStaffIds.map((id) => ({
      staff_id: id,
      display_name: staffMap.get(id) ?? 'Unknown',
      sessions: staffSessionMap.get(id)?.sessions ?? 0,
      total_minutes: Math.round(staffSessionMap.get(id)?.totalMinutes ?? 0),
      events: staffEvents.get(id)?.events ?? 0,
    })).sort((a, b) => b.sessions - a.sessions || b.events - a.events)

    // Summary
    const totalSessions = typedSessions.length
    const avgSessionMinutes = sessionsWithDuration > 0 ? Math.round(totalDurationMinutes / sessionsWithDuration) : 0
    const activeStaff = new Set(allStaffIds).size

    const response: EngagementResponse = {
      sessions,
      featureUsage,
      peakHours,
      staffEngagement,
      sopViewRate,
      summary: {
        total_sessions: totalSessions,
        avg_session_minutes: avgSessionMinutes,
        total_events: typedEvents.length,
        active_staff: activeStaff,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Engagement analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
