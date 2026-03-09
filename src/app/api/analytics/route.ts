import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DailyStat {
  date: string
  total: number
  completed: number
  completion_rate: number
}

interface StaffPerformance {
  staff_id: string
  display_name: string
  total_tasks: number
  completed_tasks: number
  completion_rate: number
}

interface ZoneComparison {
  zone_id: string
  zone_name_en: string
  zone_name_es: string
  zone_color: string
  total: number
  completed: number
  completion_rate: number
}

interface AnalyticsResponse {
  daily: DailyStat[]
  staffPerformance: StaffPerformance[]
  zoneComparison: ZoneComparison[]
  summary: {
    total_tasks: number
    completed_tasks: number
    overall_rate: number
    best_day: string
    worst_day: string
    total_shifts: number
  }
}

interface ShiftRow {
  id: string
  staff_id: string
  zone_id: string
  shift_date: string
}

interface TaskTemplateZone {
  zone_id: string
}

interface RawTaskCompletionRow {
  id: string
  shift_id: string
  staff_id: string
  status: string
  task_template: TaskTemplateZone[]
}

interface TaskCompletionRow {
  id: string
  shift_id: string
  staff_id: string
  status: string
  task_template_zone_id: string | null
}

interface StaffRow {
  id: string
  display_name: string
}

interface ZoneRow {
  id: string
  name_en: string
  name_es: string
  color: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const zoneId = searchParams.get('zone_id')
    const daysParam = searchParams.get('days')
    const days = Math.min(Math.max(parseInt(daysParam || '7', 10) || 7, 1), 90)

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // 1. Get all shifts in the date range
    let shiftsQuery = supabase
      .from('shifts')
      .select('id, staff_id, zone_id, shift_date')
      .gte('shift_date', startDateStr)

    if (zoneId) {
      shiftsQuery = shiftsQuery.eq('zone_id', zoneId)
    }

    const { data: shifts, error: shiftsError } = await shiftsQuery

    if (shiftsError) {
      return NextResponse.json({ error: shiftsError.message }, { status: 500 })
    }

    const typedShifts = (shifts ?? []) as ShiftRow[]

    if (typedShifts.length === 0) {
      const emptyResponse: AnalyticsResponse = {
        daily: [],
        staffPerformance: [],
        zoneComparison: [],
        summary: {
          total_tasks: 0,
          completed_tasks: 0,
          overall_rate: 0,
          best_day: '',
          worst_day: '',
          total_shifts: 0,
        },
      }
      return NextResponse.json(emptyResponse)
    }

    const shiftIds = typedShifts.map((s) => s.id)

    // 2. Get all task_completions for those shifts with task_template join
    // Supabase has a limit on `in` filter, so batch if needed
    const batchSize = 200
    const allCompletions: TaskCompletionRow[] = []

    for (let i = 0; i < shiftIds.length; i += batchSize) {
      const batch = shiftIds.slice(i, i + batchSize)
      const { data: completions, error: tcError } = await supabase
        .from('task_completions')
        .select('id, shift_id, staff_id, status, task_template:task_templates(zone_id)')
        .in('shift_id', batch)

      if (tcError) {
        return NextResponse.json({ error: tcError.message }, { status: 500 })
      }

      const mapped: TaskCompletionRow[] = ((completions ?? []) as RawTaskCompletionRow[]).map((row) => ({
        id: row.id,
        shift_id: row.shift_id,
        staff_id: row.staff_id,
        status: row.status,
        task_template_zone_id: row.task_template?.[0]?.zone_id ?? null,
      }))
      allCompletions.push(...mapped)
    }

    // 3. Get staff display names
    const staffIds = [...new Set(typedShifts.map((s) => s.staff_id))]
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, display_name')
      .in('id', staffIds)

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    const staffMap = new Map<string, string>()
    for (const s of (staffData ?? []) as StaffRow[]) {
      staffMap.set(s.id, s.display_name)
    }

    // 4. Get zones for name/color
    const zoneIds = [...new Set(typedShifts.map((s) => s.zone_id))]
    const { data: zonesData, error: zonesError } = await supabase
      .from('zones')
      .select('id, name_en, name_es, color')
      .in('id', zoneIds)

    if (zonesError) {
      return NextResponse.json({ error: zonesError.message }, { status: 500 })
    }

    const zoneMap = new Map<string, ZoneRow>()
    for (const z of (zonesData ?? []) as ZoneRow[]) {
      zoneMap.set(z.id, z)
    }

    // Build a shift lookup: shift_id -> ShiftRow
    const shiftMap = new Map<string, ShiftRow>()
    for (const s of typedShifts) {
      shiftMap.set(s.id, s)
    }

    // --- Aggregate daily stats ---
    const dailyMap = new Map<string, { total: number; completed: number }>()

    for (const tc of allCompletions) {
      const shift = shiftMap.get(tc.shift_id)
      if (!shift) continue
      const date = shift.shift_date

      const entry = dailyMap.get(date) ?? { total: 0, completed: 0 }
      entry.total += 1
      if (tc.status === 'completed') {
        entry.completed += 1
      }
      dailyMap.set(date, entry)
    }

    const daily: DailyStat[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        total: stats.total,
        completed: stats.completed,
        completion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))

    // --- Aggregate per-staff stats ---
    const staffStatsMap = new Map<string, { total: number; completed: number }>()

    for (const tc of allCompletions) {
      const sid = tc.staff_id
      const entry = staffStatsMap.get(sid) ?? { total: 0, completed: 0 }
      entry.total += 1
      if (tc.status === 'completed') {
        entry.completed += 1
      }
      staffStatsMap.set(sid, entry)
    }

    const staffPerformance: StaffPerformance[] = Array.from(staffStatsMap.entries())
      .map(([staffId, stats]) => ({
        staff_id: staffId,
        display_name: staffMap.get(staffId) ?? 'Unknown',
        total_tasks: stats.total,
        completed_tasks: stats.completed,
        completion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.completion_rate - a.completion_rate || b.completed_tasks - a.completed_tasks)

    // --- Aggregate per-zone stats ---
    const zoneStatsMap = new Map<string, { total: number; completed: number }>()

    for (const tc of allCompletions) {
      // Use the task_template's zone_id if available, otherwise use the shift's zone_id
      const shift = shiftMap.get(tc.shift_id)
      const tcZoneId = tc.task_template_zone_id ?? shift?.zone_id
      if (!tcZoneId) continue

      const entry = zoneStatsMap.get(tcZoneId) ?? { total: 0, completed: 0 }
      entry.total += 1
      if (tc.status === 'completed') {
        entry.completed += 1
      }
      zoneStatsMap.set(tcZoneId, entry)
    }

    const zoneComparison: ZoneComparison[] = Array.from(zoneStatsMap.entries())
      .map(([zId, stats]) => {
        const zone = zoneMap.get(zId)
        return {
          zone_id: zId,
          zone_name_en: zone?.name_en ?? 'Unknown',
          zone_name_es: zone?.name_es ?? 'Desconocido',
          zone_color: zone?.color ?? '#888888',
          total: stats.total,
          completed: stats.completed,
          completion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        }
      })
      .sort((a, b) => b.completion_rate - a.completion_rate)

    // --- Summary ---
    const totalTasks = allCompletions.length
    const completedTasks = allCompletions.filter((tc) => tc.status === 'completed').length
    const overallRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    let bestDay = ''
    let worstDay = ''
    let bestRate = -1
    let worstRate = 101

    for (const d of daily) {
      if (d.completion_rate > bestRate) {
        bestRate = d.completion_rate
        bestDay = d.date
      }
      if (d.completion_rate < worstRate) {
        worstRate = d.completion_rate
        worstDay = d.date
      }
    }

    // Count unique shifts
    const totalShifts = typedShifts.length

    const response: AnalyticsResponse = {
      daily,
      staffPerformance,
      zoneComparison,
      summary: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        overall_rate: overallRate,
        best_day: bestDay,
        worst_day: worstDay,
        total_shifts: totalShifts,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
