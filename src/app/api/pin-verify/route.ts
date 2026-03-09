import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin, staff_id } = body

    if (!pin || !staff_id) {
      return NextResponse.json({ error: 'Missing staff_id or PIN' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the staff member
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*, role:roles(*)')
      .eq('id', staff_id)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Verify PIN
    const { data: match } = await supabase
      .rpc('check_pin', { p_pin: pin, p_hash: staff.pin_hash })

    if (match !== true) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Return staff data (no zone/shift — those come after zone/role selection)
    const { pin_hash, ...safeStaff } = staff

    return NextResponse.json({
      staff: safeStaff,
    })
  } catch (error) {
    console.error('PIN verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
