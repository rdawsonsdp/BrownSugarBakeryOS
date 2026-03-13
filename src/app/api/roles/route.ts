import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/require-manager'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('roles')
    .select('*, zone:zones(id, name_en, name_es, slug, color)')
    .eq('is_active', true)
    .order('sort_order')
    .order('name_en')

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

  const { name_en, name_es, slug, is_manager, zone_id, sort_order } = body

  const { data, error } = await supabase
    .from('roles')
    .insert({
      name_en,
      name_es,
      slug,
      is_manager: is_manager ?? false,
      zone_id: zone_id || null,
      sort_order: sort_order ?? 10,
    })
    .select('*, zone:zones(id, name_en, name_es, slug, color)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const supabase = await createClient()
  const body = await request.json()
  const { id, ...fields } = body

  if (!id) {
    return NextResponse.json({ error: 'Role id required' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if ('name_en' in fields) updateData.name_en = fields.name_en
  if ('name_es' in fields) updateData.name_es = fields.name_es
  if ('slug' in fields) updateData.slug = fields.slug
  if ('is_manager' in fields) updateData.is_manager = fields.is_manager
  if ('zone_id' in fields) updateData.zone_id = fields.zone_id || null
  if ('sort_order' in fields) updateData.sort_order = fields.sort_order

  const { data, error } = await supabase
    .from('roles')
    .update(updateData)
    .eq('id', id)
    .select('*, zone:zones(id, name_en, name_es, slug, color)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Role id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('roles')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
