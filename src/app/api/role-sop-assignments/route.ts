import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/require-manager'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const role_id = searchParams.get('role_id')

  if (!role_id) {
    return NextResponse.json({ error: 'role_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('role_sop_assignments')
    .select('*, sop:sops(id, name_en, name_es, is_critical, category, sort_order, zone_id)')
    .eq('role_id', role_id)
    .eq('is_active', true)
    .order('created_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const supabase = await createClient()
  const body = await request.json()
  const { role_id, sop_id } = body

  if (!role_id || !sop_id) {
    return NextResponse.json({ error: 'role_id and sop_id are required' }, { status: 400 })
  }

  // Check if an inactive assignment already exists
  const { data: existing, error: findError } = await supabase
    .from('role_sop_assignments')
    .select('*')
    .eq('role_id', role_id)
    .eq('sop_id', sop_id)
    .maybeSingle()

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }

  if (existing) {
    // Reactivate the existing assignment
    const { data, error } = await supabase
      .from('role_sop_assignments')
      .update({ is_active: true })
      .eq('id', existing.id)
      .select('*, sop:sops(id, name_en, name_es, is_critical, category, sort_order, zone_id)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 200 })
  }

  // Insert a new assignment
  const { data, error } = await supabase
    .from('role_sop_assignments')
    .insert({ role_id, sop_id })
    .select('*, sop:sops(id, name_en, name_es, is_critical, category, sort_order, zone_id)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const role_id = searchParams.get('role_id')
  const sop_id = searchParams.get('sop_id')

  if (!role_id || !sop_id) {
    return NextResponse.json({ error: 'role_id and sop_id are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('role_sop_assignments')
    .update({ is_active: false })
    .eq('role_id', role_id)
    .eq('sop_id', sop_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
