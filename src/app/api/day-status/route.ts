import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChicagoDate, getChicagoHour } from '@/lib/utils/timezone'

/** GET /api/day-status?zone_id=X&staff_id=Y — check if day started + staff assignment */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const zoneId = searchParams.get('zone_id')
    const staffId = searchParams.get('staff_id')

    if (!zoneId || !staffId) {
      return NextResponse.json({ error: 'zone_id and staff_id are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const today = getChicagoDate()
    const hour = getChicagoHour()
    const shiftType = hour < 11 ? 'opening' : hour < 15 ? 'mid' : 'closing'

    // Check if any assignments exist for this zone/date/shift
    const { data: assignments } = await supabase
      .from('day_assignments')
      .select('id, staff_id, status, role:roles(id, name_en, name_es, slug, is_manager)')
      .eq('zone_id', zoneId)
      .eq('shift_date', today)
      .eq('shift_type', shiftType)

    if (!assignments || assignments.length === 0) {
      // No assignments at all — day not set up yet
      return NextResponse.json({
        day_setup: false,
        day_started: false,
        staff_assignment: null,
      })
    }

    const dayStarted = assignments.some((a) => a.status === 'started')

    // Find this staff member's assignment
    const staffAssignment = assignments.find((a) => a.staff_id === staffId)
    // Supabase may return role as object or array depending on the join
    const role = staffAssignment?.role
    const roleObj = Array.isArray(role) ? role[0] : role

    return NextResponse.json({
      day_setup: true,
      day_started: dayStarted,
      staff_assignment: staffAssignment && roleObj
        ? {
            role_id: roleObj.id,
            role_name_en: roleObj.name_en,
            role_name_es: roleObj.name_es,
            status: staffAssignment.status,
          }
        : null,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
