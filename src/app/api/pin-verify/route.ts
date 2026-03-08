import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { pin, zone_id, role_id } = await request.json()

    if (!pin || !zone_id || !role_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find staff matching the PIN in the given zone
    // We check all staff in the zone and verify PIN via pgcrypto
    const { data: staff, error: staffError } = await supabase.rpc('verify_pin', {
      p_pin: pin,
      p_zone_id: zone_id,
      p_role_id: role_id,
    })

    if (staffError) {
      // Fallback: query directly if RPC not available
      const { data: staffList, error: listError } = await supabase
        .from('staff')
        .select('*, role:roles(*)')
        .eq('zone_id', zone_id)
        .eq('is_active', true)

      if (listError || !staffList || staffList.length === 0) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
      }

      // Verify PIN using SQL crypt function
      for (const s of staffList) {
        const { data: match } = await supabase
          .rpc('check_pin', { p_pin: pin, p_hash: s.pin_hash })

        if (match === true) {
          // Check if role matches (manager PIN can access both roles)
          const isManager = s.role?.is_manager || false
          const { data: requestedRole } = await supabase
            .from('roles')
            .select('*')
            .eq('id', role_id)
            .single()

          if (!requestedRole) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 401 })
          }

          // Managers can access any role, staff can only access staff role
          if (!isManager && requestedRole.is_manager) {
            continue // This staff member can't access manager role
          }

          // Update streak
          const today = new Date().toISOString().split('T')[0]
          const streakUpdate = s.last_login_date === today
            ? {}
            : {
                streak_count: s.last_login_date &&
                  new Date(today).getTime() - new Date(s.last_login_date).getTime() <= 86400000 * 2
                    ? s.streak_count + 1
                    : 1,
                last_login_date: today,
              }

          if (Object.keys(streakUpdate).length > 0) {
            await supabase
              .from('staff')
              .update(streakUpdate)
              .eq('id', s.id)
          }

          // Determine shift type based on current hour
          const hour = new Date().getHours()
          const shiftType = hour < 11 ? 'opening' : hour < 15 ? 'mid' : 'closing'

          // Create or resume shift
          const { data: existingShift } = await supabase
            .from('shifts')
            .select('*')
            .eq('staff_id', s.id)
            .eq('shift_date', today)
            .eq('shift_type', shiftType)
            .single()

          let shift = existingShift

          if (!shift) {
            const { data: newShift, error: shiftError } = await supabase
              .from('shifts')
              .insert({
                staff_id: s.id,
                zone_id: zone_id,
                shift_type: shiftType,
                shift_date: today,
              })
              .select()
              .single()

            if (shiftError) {
              return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
            }
            shift = newShift

            // Create pending task completions for this shift
            const dayOfWeek = new Date().getDay()

            // Get IDs of SOPs NOT scheduled for today
            const { data: excludedSOPs } = await supabase
              .from('sops')
              .select('id')
              .eq('zone_id', zone_id)
              .not('days_of_week', 'is', null)
              .not('days_of_week', 'cs', `{${dayOfWeek}}`)

            const excludedIds = new Set(excludedSOPs?.map((es) => es.id) ?? [])

            const { data: templates } = await supabase
              .from('task_templates')
              .select('*')
              .eq('zone_id', zone_id)
              .eq('shift_type', shiftType)
              .eq('is_active', true)

            // Filter out templates linked to excluded SOPs
            const todayTemplates = templates?.filter((t) =>
              !t.sop_id || !excludedIds.has(t.sop_id)
            ) ?? []

            if (todayTemplates.length > 0) {
              const completions = todayTemplates.map((t) => ({
                task_template_id: t.id,
                shift_id: shift!.id,
                staff_id: s.id,
                status: 'pending' as const,
              }))

              await supabase.from('task_completions').insert(completions)
            }
          }

          // Get zone info
          const { data: zone } = await supabase
            .from('zones')
            .select('*')
            .eq('id', zone_id)
            .single()

          return NextResponse.json({
            staff: { ...s, ...streakUpdate, pin_hash: undefined },
            zone,
            role: requestedRole,
            shift,
          })
        }
      }

      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // If RPC worked (future enhancement)
    if (!staff || staff.length === 0) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    return NextResponse.json(staff[0])
  } catch (error) {
    console.error('PIN verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
