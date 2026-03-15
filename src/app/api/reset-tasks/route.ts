import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChicagoDate, getChicagoHour } from '@/lib/utils/timezone'
import { populateTasksForShift } from '@/lib/tasks/populate-tasks'

export async function POST(request: NextRequest) {
  try {
    const { zone_id, staff_id } = await request.json()

    if (!zone_id || !staff_id) {
      return NextResponse.json({ error: 'zone_id and staff_id are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify caller is a manager
    const { data: callerStaff } = await supabase
      .from('staff')
      .select('*, role:roles(*)')
      .eq('id', staff_id)
      .single()

    if (!callerStaff?.role?.is_manager) {
      return NextResponse.json({ error: 'Only managers can reset tasks' }, { status: 403 })
    }
    const today = getChicagoDate()
    const hour = getChicagoHour()
    const shiftType = hour < 11 ? 'opening' : hour < 15 ? 'mid' : 'closing'

    // Find all active (non-ended) shifts for today in this zone
    const { data: activeShifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .eq('zone_id', zone_id)
      .eq('shift_date', today)
      .is('ended_at', null)

    if (shiftsError) {
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
    }

    if (!activeShifts || activeShifts.length === 0) {
      return NextResponse.json({ error: 'No active shifts found for this zone today' }, { status: 404 })
    }

    const shiftIds = activeShifts.map((s) => s.id)

    // Delete all task_completions for these shifts in batch
    const { error: deleteError } = await supabase
      .from('task_completions')
      .delete()
      .in('shift_id', shiftIds)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete task completions' }, { status: 500 })
    }

    // Regenerate tasks for each shift
    for (const shift of activeShifts) {
      await populateTasksForShift({
        supabase,
        shiftId: shift.id,
        staffId: shift.staff_id,
        zoneId: zone_id,
        roleId: shift.role_id,
        shiftType: shift.shift_type || shiftType,
      })
    }

    return NextResponse.json({
      success: true,
      shiftsReset: activeShifts.length,
    })
  } catch (error) {
    console.error('Reset tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
