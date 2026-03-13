import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const zoneId = searchParams.get('zone_id')
  const category = searchParams.get('category')
  const library = searchParams.get('library')
  const showInactive = searchParams.get('show_inactive')
  const status = searchParams.get('status') || 'published'

  let query = supabase
    .from('sops')
    .select('*, sop_steps(*), assigned_staff:staff!sops_assigned_staff_id_fkey(id, display_name, role_id)')
    .order('sort_order', { ascending: true })

  if (library === 'true') {
    // Library mode: show all statuses, filter by is_active unless show_inactive
    if (showInactive !== 'true') {
      query = query.eq('is_active', true)
    }
  } else {
    // Default mode: only published + active SOPs
    query = query.eq('status', status).eq('is_active', true)
  }

  if (zoneId) query = query.eq('zone_id', zoneId)
  if (category) query = query.eq('category', category)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sort steps by step_number
  const sops = data?.map((sop) => ({
    ...sop,
    sop_steps: sop.sop_steps?.sort((a: { step_number: number }, b: { step_number: number }) => a.step_number - b.step_number),
  }))

  return NextResponse.json(sops)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { steps, ...sopData } = body

  // Create the SOP
  const { data: sop, error: sopError } = await supabase
    .from('sops')
    .insert(sopData)
    .select()
    .single()

  if (sopError) {
    return NextResponse.json({ error: sopError.message }, { status: 500 })
  }

  // Create steps if provided
  if (steps && steps.length > 0) {
    const stepsWithSopId = steps.map((step: Record<string, unknown>, i: number) => ({
      ...step,
      sop_id: sop.id,
      step_number: i + 1,
    }))

    const { error: stepsError } = await supabase
      .from('sop_steps')
      .insert(stepsWithSopId)

    if (stepsError) {
      return NextResponse.json({ error: stepsError.message }, { status: 500 })
    }
  }

  // Fetch complete SOP with steps
  const { data: completeSop } = await supabase
    .from('sops')
    .select('*, sop_steps(*)')
    .eq('id', sop.id)
    .single()

  return NextResponse.json(completeSop, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { id, steps, ...sopData } = body

  if (!id) {
    return NextResponse.json({ error: 'SOP id required' }, { status: 400 })
  }

  const { error: sopError } = await supabase
    .from('sops')
    .update({ ...sopData, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (sopError) {
    return NextResponse.json({ error: sopError.message }, { status: 500 })
  }

  // Replace steps if provided
  if (steps) {
    await supabase.from('sop_steps').delete().eq('sop_id', id)

    if (steps.length > 0) {
      const stepsWithSopId = steps.map((step: Record<string, unknown>, i: number) => ({
        ...step,
        sop_id: id,
        step_number: i + 1,
      }))

      await supabase.from('sop_steps').insert(stepsWithSopId)
    }
  }

  const { data: completeSop } = await supabase
    .from('sops')
    .select('*, sop_steps(*)')
    .eq('id', id)
    .single()

  return NextResponse.json(completeSop)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { id, ...fields } = body

  if (!id) {
    return NextResponse.json({ error: 'SOP id required' }, { status: 400 })
  }

  // Bulk reorder: { reorder: [{ id, sort_order }] }
  if ('reorder' in fields && Array.isArray(fields.reorder)) {
    const updates = fields.reorder as { id: string; sort_order: number }[]
    for (const item of updates) {
      await supabase
        .from('sops')
        .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
        .eq('id', item.id)
    }
    return NextResponse.json({ success: true })
  }

  // Allow updating: is_active, assigned_staff_id, etc.
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('is_active' in fields) updateData.is_active = fields.is_active
  if ('assigned_staff_id' in fields) updateData.assigned_staff_id = fields.assigned_staff_id
  if ('sort_order' in fields) updateData.sort_order = fields.sort_order
  if ('status' in fields) updateData.status = fields.status

  const { data, error } = await supabase
    .from('sops')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Cascade: when assigned_staff_id changes, reassign today's pending task completions
  if ('assigned_staff_id' in fields) {
    const newStaffId = fields.assigned_staff_id as string | null
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    // Find task_templates linked to this SOP
    const { data: templates } = await supabase
      .from('task_templates')
      .select('id')
      .eq('sop_id', id)

    if (templates && templates.length > 0) {
      const templateIds = templates.map((t: { id: string }) => t.id)

      // Find the new staff member's active shift for today (if reassigning to someone)
      let newShiftId: string | null = null
      if (newStaffId) {
        const { data: shifts } = await supabase
          .from('shifts')
          .select('id')
          .eq('staff_id', newStaffId)
          .eq('shift_date', today)
          .is('ended_at', null)
          .limit(1)
          .single()
        newShiftId = shifts?.id || null
      }

      // Update pending task completions for today
      const updatePayload: Record<string, unknown> = {
        staff_id: newStaffId,
        updated_at: new Date().toISOString(),
      }
      if (newShiftId) {
        updatePayload.shift_id = newShiftId
      }

      await supabase
        .from('task_completions')
        .update(updatePayload)
        .in('task_template_id', templateIds)
        .eq('status', 'pending')
        .gte('created_at', `${today}T00:00:00`)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'SOP id required' }, { status: 400 })
  }

  // Soft-delete: set is_active to false
  const { error } = await supabase
    .from('sops')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
