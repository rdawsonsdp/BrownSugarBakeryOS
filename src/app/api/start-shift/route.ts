import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { staff_id, zone_id, role_id } = await request.json()

    if (!staff_id || !zone_id || !role_id) {
      return NextResponse.json({ error: 'staff_id, zone_id, and role_id are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const hour = new Date().getHours()
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

    if (!shift) {
      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          staff_id,
          zone_id,
          shift_type: shiftType,
          shift_date: today,
        })
        .select()
        .single()

      if (shiftError) {
        return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
      }
      shift = newShift

      // 2. Create task completions for this role
      // Get SOPs assigned to this role via role_sop_assignments
      const { data: roleAssignments } = await supabase
        .from('role_sop_assignments')
        .select('sop_id')
        .eq('role_id', role_id)
        .eq('is_active', true)

      const assignedSopIds = roleAssignments?.map((a) => a.sop_id) ?? []

      // Filter by day of week
      const dayOfWeek = new Date().getDay()
      if (assignedSopIds.length > 0) {
        const { data: excludedSOPs } = await supabase
          .from('sops')
          .select('id')
          .in('id', assignedSopIds)
          .not('days_of_week', 'is', null)
          .not('days_of_week', 'cs', `{${dayOfWeek}}`)

        const excludedIds = new Set(excludedSOPs?.map((s) => s.id) ?? [])
        const todaySopIds = assignedSopIds.filter((id) => !excludedIds.has(id))

        // Get task templates for these SOPs (or for this role directly)
        if (todaySopIds.length > 0) {
          const { data: templates } = await supabase
            .from('task_templates')
            .select('*')
            .eq('zone_id', zone_id)
            .eq('is_active', true)
            .in('sop_id', todaySopIds)

          const todayTemplates = templates ?? []

          if (todayTemplates.length > 0) {
            const completions = todayTemplates.map((t) => ({
              task_template_id: t.id,
              shift_id: shift!.id,
              staff_id,
              status: 'pending' as const,
            }))
            await supabase.from('task_completions').insert(completions)
          }
        }
      }

      // Also get zone-wide task templates (no specific role, no sop_id)
      const { data: zoneTemplates } = await supabase
        .from('task_templates')
        .select('*')
        .eq('zone_id', zone_id)
        .eq('shift_type', shiftType)
        .eq('is_active', true)
        .is('role_id', null)
        .is('sop_id', null)

      if (zoneTemplates && zoneTemplates.length > 0) {
        const completions = zoneTemplates.map((t) => ({
          task_template_id: t.id,
          shift_id: shift!.id,
          staff_id,
          status: 'pending' as const,
        }))
        await supabase.from('task_completions').insert(completions)
      }
    }

    // 3. Log the session for audit
    await supabase.from('login_sessions').insert({
      staff_id,
      zone_id,
      role_id,
      shift_id: shift.id,
    })

    // 4. Update streak
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

    // 5. Get full zone and role data for the client
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
    })
  } catch (error) {
    console.error('Start shift error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
