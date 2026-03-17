import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChicagoDate, getChicagoHour } from '@/lib/utils/timezone'
import { populateTasksForShift } from '@/lib/tasks/populate-tasks'

/**
 * POST /api/assign-mid-shift
 * Assigns a staff member to a role after the day has already started.
 * Creates the day_assignment (status: 'started'), shift, and populates tasks.
 */
export async function POST(request: NextRequest) {
  try {
    const { zone_id, role_id, staff_id, manager_staff_id } = await request.json()

    if (!zone_id || !role_id || !staff_id || !manager_staff_id) {
      return NextResponse.json(
        { error: 'zone_id, role_id, staff_id, and manager_staff_id are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const today = getChicagoDate()
    const hour = getChicagoHour()
    const shiftType = hour < 11 ? 'opening' : hour < 15 ? 'mid' : 'closing'

    // Verify caller is a manager
    const { data: managerStaff } = await supabase
      .from('staff')
      .select('*, role:roles(*)')
      .eq('id', manager_staff_id)
      .single()

    if (!managerStaff?.role?.is_manager) {
      return NextResponse.json({ error: 'Only managers can assign roles' }, { status: 403 })
    }

    // Clear this staff from any other role assignment in same zone/date/shift
    await supabase
      .from('day_assignments')
      .update({ staff_id: null, updated_at: new Date().toISOString() })
      .eq('zone_id', zone_id)
      .eq('shift_date', today)
      .eq('shift_type', shiftType)
      .eq('staff_id', staff_id)
      .neq('role_id', role_id)

    // Upsert day_assignment with status 'started' (day is already running)
    await supabase
      .from('day_assignments')
      .upsert(
        {
          zone_id,
          role_id,
          staff_id,
          assigned_by: manager_staff_id,
          shift_date: today,
          shift_type: shiftType,
          status: 'started',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'zone_id,role_id,shift_date,shift_type' }
      )

    // Check if shift already exists
    const { data: existingShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', staff_id)
      .eq('shift_date', today)
      .eq('shift_type', shiftType)
      .single()

    let shift = existingShift

    if (shift && shift.role_id !== role_id) {
      // Update existing shift with new role
      await supabase.from('shifts').update({ role_id, zone_id }).eq('id', shift.id)
      shift = { ...shift, role_id, zone_id }
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
        return NextResponse.json({ error: shiftError.message }, { status: 500 })
      }
      shift = newShift
    }

    // Clear any existing task completions and repopulate
    await supabase
      .from('task_completions')
      .delete()
      .eq('shift_id', shift.id)

    await populateTasksForShift({
      supabase,
      shiftId: shift.id,
      staffId: staff_id,
      zoneId: zone_id,
      roleId: role_id,
      shiftType,
    })

    // Log the session
    await supabase.from('login_sessions').insert({
      staff_id,
      zone_id,
      role_id,
      shift_id: shift.id,
    })

    return NextResponse.json({ success: true, shift_id: shift.id })
  } catch (error) {
    console.error('Assign mid-shift error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
