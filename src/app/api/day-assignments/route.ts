import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChicagoDate, getChicagoHour } from '@/lib/utils/timezone'

function currentShiftType(): string {
  const hour = getChicagoHour()
  return hour < 11 ? 'opening' : hour < 15 ? 'mid' : 'closing'
}

/** GET /api/day-assignments?zone_id=X[&shift_date=Y&shift_type=Z] */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const zoneId = searchParams.get('zone_id')
    if (!zoneId) {
      return NextResponse.json({ error: 'zone_id is required' }, { status: 400 })
    }

    const shiftDate = searchParams.get('shift_date') || getChicagoDate()
    const shiftType = searchParams.get('shift_type') || currentShiftType()

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('day_assignments')
      .select('*, role:roles(id, name_en, name_es, slug, sort_order, is_manager), staff:staff!day_assignments_staff_id_fkey(id, first_name, last_name, display_name)')
      .eq('zone_id', zoneId)
      .eq('shift_date', shiftDate)
      .eq('shift_type', shiftType)
      .order('created_at')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PUT /api/day-assignments — upsert a single assignment */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { zone_id, role_id, staff_id, assigned_by, shift_date, shift_type } = body

    if (!zone_id || !role_id || !assigned_by) {
      return NextResponse.json({ error: 'zone_id, role_id, and assigned_by are required' }, { status: 400 })
    }

    const date = shift_date || getChicagoDate()
    const type = shift_type || currentShiftType()

    const supabase = await createClient()

    // If assigning a staff member, clear them from any other role in this zone/date/shift first
    if (staff_id) {
      await supabase
        .from('day_assignments')
        .update({ staff_id: null, updated_at: new Date().toISOString() })
        .eq('zone_id', zone_id)
        .eq('shift_date', date)
        .eq('shift_type', type)
        .eq('staff_id', staff_id)
        .neq('role_id', role_id)
    }

    const { data, error } = await supabase
      .from('day_assignments')
      .upsert(
        {
          zone_id,
          role_id,
          staff_id: staff_id || null,
          assigned_by,
          shift_date: date,
          shift_type: type,
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'zone_id,role_id,shift_date,shift_type' }
      )
      .select('*, role:roles(id, name_en, name_es, slug, sort_order, is_manager), staff:staff!day_assignments_staff_id_fkey(id, first_name, last_name, display_name)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/day-assignments?id=X — clear staff from an assignment */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('day_assignments')
      .update({ staff_id: null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
