import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin, staff_id } = body

    if (!pin) {
      return NextResponse.json({ error: 'Missing PIN' }, { status: 400 })
    }

    const supabase = await createClient()

    if (staff_id) {
      // Name mode: verify PIN against a specific staff member
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*, role:roles(*)')
        .eq('id', staff_id)
        .eq('is_active', true)
        .single()

      if (staffError || !staff) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
      }

      const { data: match } = await supabase
        .rpc('check_pin', { p_pin: pin, p_hash: staff.pin_hash })

      if (match !== true) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
      }

      const { pin_hash, ...safeStaff } = staff
      return NextResponse.json({ staff: safeStaff })
    } else {
      // Role mode: find which staff member this PIN belongs to
      const { data: allStaff, error: staffError } = await supabase
        .from('staff')
        .select('*, role:roles(*)')
        .eq('is_active', true)

      if (staffError || !allStaff) {
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
      }

      for (const staff of allStaff) {
        const { data: match } = await supabase
          .rpc('check_pin', { p_pin: pin, p_hash: staff.pin_hash })

        if (match === true) {
          const { pin_hash, ...safeStaff } = staff
          return NextResponse.json({ staff: safeStaff })
        }
      }

      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }
  } catch (error) {
    console.error('PIN verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
