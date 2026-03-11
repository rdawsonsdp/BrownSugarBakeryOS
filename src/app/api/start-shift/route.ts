import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChicagoDate, getChicagoHour } from '@/lib/utils/timezone'
import { populateTasksForShift } from '@/lib/tasks/populate-tasks'

export async function POST(request: NextRequest) {
  try {
    const { staff_id, zone_id, role_id } = await request.json()

    if (!staff_id || !zone_id || !role_id) {
      return NextResponse.json({ error: 'staff_id, zone_id, and role_id are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const today = getChicagoDate()
    const hour = getChicagoHour()
    const shiftType = hour < 11 ? 'opening' : hour < 15 ? 'mid' : 'closing'

    // 1. Create or resume shift
    const { data: existingShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', staff_id)
      .eq('shift_date', today)
      .eq('shift_type', shiftType)
      .single()

    let shift = existingShift

    // Backfill role_id on existing shift if missing
    if (shift && !shift.role_id) {
      await supabase.from('shifts').update({ role_id }).eq('id', shift.id)
      shift = { ...shift, role_id }
    }

    if (!shift) {
      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          staff_id,
          zone_id,
          role_id,
          shift_type: shiftType,
          shift_date: today,
        })
        .select()
        .single()

      if (shiftError) {
        return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
      }
      shift = newShift
    }

    // 2. Check if this shift already has task completions
    const { count: existingTaskCount } = await supabase
      .from('task_completions')
      .select('*', { count: 'exact', head: true })
      .eq('shift_id', shift.id)

    // Only create tasks if the shift has none yet
    if ((existingTaskCount ?? 0) === 0) {
      await populateTasksForShift({
        supabase,
        shiftId: shift!.id,
        staffId: staff_id,
        zoneId: zone_id,
        roleId: role_id,
        shiftType,
      })
    }

    // 3. Get previous shift notes for handoff
    let previousShiftNotes: string | null = null
    const { data: prevShift } = await supabase
      .from('shifts')
      .select('notes')
      .eq('zone_id', zone_id)
      .lt('shift_date', today)
      .not('notes', 'is', null)
      .order('shift_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!prevShift) {
      // Also check earlier shifts on the same day
      const { data: earlierShift } = await supabase
        .from('shifts')
        .select('notes')
        .eq('zone_id', zone_id)
        .eq('shift_date', today)
        .neq('id', shift.id)
        .not('notes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      previousShiftNotes = earlierShift?.notes || null
    } else {
      previousShiftNotes = prevShift.notes || null
    }

    // 4. Log the session for audit
    await supabase.from('login_sessions').insert({
      staff_id,
      zone_id,
      role_id,
      shift_id: shift.id,
    })

    // 5. Update streak
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('streak_count, last_login_date')
      .eq('id', staff_id)
      .single()

    if (staffRecord) {
      const streakUpdate = staffRecord.last_login_date === today
        ? {}
        : {
            streak_count: staffRecord.last_login_date &&
              new Date(today).getTime() - new Date(staffRecord.last_login_date).getTime() <= 86400000 * 2
                ? staffRecord.streak_count + 1
                : 1,
            last_login_date: today,
          }

      if (Object.keys(streakUpdate).length > 0) {
        await supabase.from('staff').update(streakUpdate).eq('id', staff_id)
      }
    }

    // 6. Get full zone and role data for the client
    const [{ data: zone }, { data: role }, { data: staff }] = await Promise.all([
      supabase.from('zones').select('*').eq('id', zone_id).single(),
      supabase.from('roles').select('*').eq('id', role_id).single(),
      supabase.from('staff').select('*, role:roles(*)').eq('id', staff_id).single(),
    ])

    const { pin_hash, ...safeStaff } = staff as Record<string, unknown>

    return NextResponse.json({
      staff: safeStaff,
      zone,
      role,
      shift,
      previousShiftNotes,
    })
  } catch (error) {
    console.error('Start shift error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
