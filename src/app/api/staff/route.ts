import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getNextRoleSequence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roleId: string,
  zoneId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('staff')
    .select('role_sequence')
    .eq('role_id', roleId)
    .eq('zone_id', zoneId)
    .order('role_sequence', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return 1
  return (data[0].role_sequence ?? 0) + 1
}

async function generateDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roleId: string,
  zoneId: string,
  sequence: number
): Promise<string> {
  const { data: role } = await supabase
    .from('roles')
    .select('name_en')
    .eq('id', roleId)
    .single()

  const roleName = role?.name_en ?? 'Staff'
  return `${roleName} ${sequence}`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const zoneId = searchParams.get('zone_id')

  if (!zoneId) {
    return NextResponse.json({ error: 'zone_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff')
    .select('*, role:roles(*)')
    .eq('zone_id', zoneId)
    .order('is_active', { ascending: false })
    .order('display_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Strip pin_hash from response
  const staff = data?.map(({ pin_hash, ...rest }) => rest) ?? []

  return NextResponse.json(staff)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { pin, role_id, zone_id, preferred_language, first_name, last_name } = body

  if (!pin || !role_id || !zone_id) {
    return NextResponse.json({ error: 'Missing required fields: pin, role_id, zone_id' }, { status: 400 })
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
  }

  // Hash PIN via pgcrypto
  const { data: hashedPin, error: hashError } = await supabase.rpc('hash_pin', { p_pin: pin })

  if (hashError) {
    return NextResponse.json({ error: 'Failed to hash PIN' }, { status: 500 })
  }

  // Auto-assign role sequence number and generate display name
  const roleSequence = await getNextRoleSequence(supabase, role_id, zone_id)
  const displayName = await generateDisplayName(supabase, role_id, zone_id, roleSequence)

  const { data, error } = await supabase
    .from('staff')
    .insert({
      first_name: first_name || null,
      last_name: last_name || null,
      display_name: displayName,
      pin_hash: hashedPin,
      role_id,
      zone_id,
      role_sequence: roleSequence,
      preferred_language: preferred_language || 'en',
      is_active: true,
      streak_count: 0,
    })
    .select('*, role:roles(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { pin_hash, ...staff } = data
  return NextResponse.json(staff, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { id, pin, role_id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Staff id is required' }, { status: 400 })
  }

  // If PIN provided, validate and hash it
  if (pin) {
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    const { data: hashedPin, error: hashError } = await supabase.rpc('hash_pin', { p_pin: pin })

    if (hashError) {
      return NextResponse.json({ error: 'Failed to hash PIN' }, { status: 500 })
    }

    updates.pin_hash = hashedPin
  }

  // If role is changing, assign new sequence number and regenerate display name
  if (role_id) {
    // Get current staff to check if role actually changed
    const { data: current } = await supabase
      .from('staff')
      .select('role_id, zone_id')
      .eq('id', id)
      .single()

    if (current && current.role_id !== role_id) {
      const roleSequence = await getNextRoleSequence(supabase, role_id, current.zone_id)
      const displayName = await generateDisplayName(supabase, role_id, current.zone_id, roleSequence)
      updates.role_id = role_id
      updates.role_sequence = roleSequence
      updates.display_name = displayName
    } else {
      updates.role_id = role_id
    }
  }

  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select('*, role:roles(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { pin_hash, ...staff } = data
  return NextResponse.json(staff)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Staff id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('staff')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
