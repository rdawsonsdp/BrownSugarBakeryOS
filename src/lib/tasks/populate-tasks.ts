import type { SupabaseClient } from '@supabase/supabase-js'

interface PopulateParams {
  supabase: SupabaseClient
  shiftId: string
  staffId: string
  zoneId: string
  roleId: string
  shiftType: string
}

/**
 * Populate task_completions for a shift based on the 3-tier SOP resolution:
 *   1. Role-assigned SOPs (via role_sop_assignments)
 *   2. Staff-assigned SOPs (via sops.assigned_staff_id)
 *   3. Zone-wide task templates (no role/sop binding)
 *
 * Shared between start-shift (initial creation) and reset-tasks (regeneration).
 */
export async function populateTasksForShift({
  supabase,
  shiftId,
  staffId,
  zoneId,
  roleId,
  shiftType,
}: PopulateParams) {
  const dayOfWeek = new Date().getDay()
  const handledSopIds = new Set<string>()

  const createTasksFromSops = async (
    sops: Array<{
      id: string
      name_en: string
      name_es: string
      description_en: string | null
      description_es: string | null
      sort_order: number
      is_critical: boolean
      days_of_week: number[] | null
    }>,
  ) => {
    // Filter by day of week and skip already-handled SOPs
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
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .in('sop_id', sopIds)

    const templateBySopId = new Map<string, { id: string; sop_id: string }>(
      (existingTemplates ?? []).map((t: { id: string; sop_id: string }) => [t.sop_id, t]),
    )

    // Create missing task_templates
    const missing = todaySops
      .filter((sop) => !templateBySopId.has(sop.id))
      .map((sop) => ({
        name_en: sop.name_en,
        name_es: sop.name_es,
        description_en: sop.description_en,
        description_es: sop.description_es,
        zone_id: zoneId,
        shift_type: shiftType,
        sop_id: sop.id,
        priority: sop.sort_order ?? 5,
        is_critical: sop.is_critical,
      }))

    if (missing.length > 0) {
      const { data: created } = await supabase
        .from('task_templates')
        .insert(missing)
        .select()
      for (const t of created ?? []) templateBySopId.set(t.sop_id, t)
    }

    const completions = todaySops
      .map((sop) => {
        const template = templateBySopId.get(sop.id)
        if (!template) return null
        handledSopIds.add(sop.id)
        return {
          task_template_id: template.id,
          shift_id: shiftId,
          staff_id: staffId,
          status: 'pending' as const,
        }
      })
      .filter(Boolean)

    if (completions.length > 0) {
      await supabase.from('task_completions').insert(completions)
    }
  }

  // PRIMARY: SOPs assigned to this ROLE via role_sop_assignments
  const { data: roleAssignments } = await supabase
    .from('role_sop_assignments')
    .select('sop_id')
    .eq('role_id', roleId)
    .eq('is_active', true)

  const roleSopIds = roleAssignments?.map((a: { sop_id: string }) => a.sop_id) ?? []
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

  // SECONDARY: SOPs assigned directly to this staff member
  const { data: staffSops } = await supabase
    .from('sops')
    .select('*')
    .eq('zone_id', zoneId)
    .eq('assigned_staff_id', staffId)
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
    .eq('zone_id', zoneId)
    .eq('shift_type', shiftType)
    .eq('is_active', true)
    .is('role_id', null)
    .is('sop_id', null)

  if (zoneTemplates && zoneTemplates.length > 0) {
    const completions = zoneTemplates.map((t: { id: string }) => ({
      task_template_id: t.id,
      shift_id: shiftId,
      staff_id: staffId,
      status: 'pending' as const,
    }))
    await supabase.from('task_completions').insert(completions)
  }
}
