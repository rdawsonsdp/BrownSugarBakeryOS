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
      const dayOfWeek = new Date().getDay()
      const handledSopIds = new Set<string>()

      // Helper: find or create task_template for a SOP, then create task_completion
      const createTasksFromSops = async (sops: Array<{ id: string; name_en: string; name_es: string; description_en: string | null; description_es: string | null; sort_order: number; is_critical: boolean; days_of_week: number[] | null }>) => {
        // Filter by day of week
        const todaySops = sops.filter((sop) => {
          if (handledSopIds.has(sop.id)) return false
          if (sop.days_of_week && !sop.days_of_week.includes(dayOfWeek)) return false
          return true
        })
        if (todaySops.length === 0) return

        const sopIds = todaySops.map((s) => s.id)
        const { data: existingTemplates } = await supabase
          .from('task_templates')
          .select('*')
          .eq('zone_id', zone_id)
          .eq('is_active', true)
          .in('sop_id', sopIds)

        const templateBySopId = new Map(
          (existingTemplates ?? []).map((t) => [t.sop_id, t])
        )

        // Create missing task_templates
        const missing = todaySops
          .filter((sop) => !templateBySopId.has(sop.id))
          .map((sop) => ({
            name_en: sop.name_en,
            name_es: sop.name_es,
            description_en: sop.description_en,
            description_es: sop.description_es,
            zone_id,
            shift_type: shiftType,
            sop_id: sop.id,
            priority: sop.sort_order ?? 5,
            is_critical: sop.is_critical,
          }))

        if (missing.length > 0) {
          const { data: created } = await supabase
            .from('task_templates').insert(missing).select()
          for (const t of created ?? []) templateBySopId.set(t.sop_id, t)
        }

        const completions = todaySops
          .map((sop) => {
            const template = templateBySopId.get(sop.id)
            if (!template) return null
            handledSopIds.add(sop.id)
            return {
              task_template_id: template.id,
              shift_id: shift!.id,
              staff_id,
              status: 'pending' as const,
            }
          })
          .filter(Boolean)

        if (completions.length > 0) {
          await supabase.from('task_completions').insert(completions)
        }
      }

      // PRIMARY: Get SOPs assigned to this ROLE via role_sop_assignments
      const { data: roleAssignments } = await supabase
        .from('role_sop_assignments')
        .select('sop_id')
        .eq('role_id', role_id)
        .eq('is_active', true)

      const roleSopIds = roleAssignments?.map((a) => a.sop_id) ?? []
      if (roleSopIds.length > 0) {
        const { data: roleSops } = await supabase
          .from('sops')
          .select('*')
          .in('id', roleSopIds)
          .eq('is_active', true)
          .eq('status', 'published')
          .order('sort_order')

        if (roleSops && roleSops.length > 0) {
          await createTasksFromSops(roleSops)
        }
      }

      // SECONDARY: Get SOPs assigned directly to this staff member
      const { data: staffSops } = await supabase
        .from('sops')
        .select('*')
        .eq('zone_id', zone_id)
        .eq('assigned_staff_id', staff_id)
        .eq('is_active', true)
        .eq('status', 'published')
        .order('sort_order')

      if (staffSops && staffSops.length > 0) {
        await createTasksFromSops(staffSops)
      }

      // TERTIARY: Zone-wide task templates (no specific role, no sop_id)
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
