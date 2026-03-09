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
    .select('*, sop_steps(*)')
    .order('created_at', { ascending: false })

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
  const { id, is_active } = body

  if (!id) {
    return NextResponse.json({ error: 'SOP id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sops')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
