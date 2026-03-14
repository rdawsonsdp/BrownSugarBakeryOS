import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChicagoDate, getChicagoHour } from '@/lib/utils/timezone'
import { populateTasksForShift } from '@/lib/tasks/populate-tasks'

export async function POST(request: NextRequest) {
  try {
    const { zone_id, manager_staff_id } = await request.json()

    if (!zone_id || !manager_staff_id) {
      return NextResponse.json({ error: 'zone_id and manager_staff_id are required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Only managers can start the day' }, { status: 403 })
    }

    // Get all draft assignments with staff assigned
    const { data: assignments, error: fetchError } = await supabase
      .from('day_assignments')
      .select('*, role:roles(*), staff:staff!day_assignments_staff_id_fkey(*)')
      .eq('zone_id', zone_id)
      .eq('shift_date', today)
      .eq('shift_type', shiftType)
      .eq('status', 'draft')
      .not('staff_id', 'is', null)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: 'No staff assigned to any roles' }, { status: 400 })
    }

    let shiftsCreated = 0

    for (const assignment of assignments) {
      const staffId = assignment.staff_id
      const roleId = assignment.role_id

      // Check if shift already exists (idempotent)
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', staffId)
        .eq('shift_date', today)
        .eq('shift_type', shiftType)
        .single()

      let shift = existingShift

      if (shift && !shift.role_id) {
        await supabase.from('shifts').update({ role_id: roleId }).eq('id', shift.id)
        shift = { ...shift, role_id: roleId }
      }

      if (!shift) {
        const { data: newShift, error: shiftError } = await supabase
          .from('shifts')
          .insert({
            staff_id: staffId,
            zone_id,
            role_id: roleId,
            shift_type: shiftType,
            shift_date: today,
          })
          .select()
          .single()

        if (shiftError) {
          console.error(`Failed to create shift for staff ${staffId}:`, shiftError)
          continue
        }
        shift = newShift
        shiftsCreated++
      }

      // Check if tasks already exist
      const { count: existingTaskCount } = await supabase
        .from('task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('shift_id', shift.id)

      if ((existingTaskCount ?? 0) === 0) {
        await populateTasksForShift({
          supabase,
          shiftId: shift.id,
          staffId,
          zoneId: zone_id,
          roleId,
          shiftType,
        })
      }

      // Log the session
      await supabase.from('login_sessions').insert({
        staff_id: staffId,
        zone_id,
        role_id: roleId,
        shift_id: shift.id,
      })
    }

    // Mark all assignments as started
    await supabase
      .from('day_assignments')
      .update({ status: 'started', updated_at: new Date().toISOString() })
      .eq('zone_id', zone_id)
      .eq('shift_date', today)
      .eq('shift_type', shiftType)
      .eq('status', 'draft')

    return NextResponse.json({
      success: true,
      shifts_created: shiftsCreated,
      assignments_started: assignments.length,
    })
  } catch (error) {
    console.error('Start day error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
