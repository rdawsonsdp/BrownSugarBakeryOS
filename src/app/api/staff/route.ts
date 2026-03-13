import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/require-manager'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const zoneId = searchParams.get('zone_id')
  const allActive = searchParams.get('all_active')

  let query = supabase
    .from('staff')
    .select('*, role:roles(*)')
    .order('is_active', { ascending: false })
    .order('display_name')

  if (allActive === 'true') {
    // Return all active staff (for login name selection)
    query = query.eq('is_active', true)
  } else if (zoneId) {
    query = query.eq('zone_id', zoneId)
  } else {
    // Return all staff
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Strip pin_hash from response
  const staff = data?.map(({ pin_hash, ...rest }) => rest) ?? []

  return NextResponse.json(staff)
}

export async function POST(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const supabase = await createClient()
  const body = await request.json()

  const { first_name, last_name, display_name, pin, role_id, zone_id, preferred_language, phone, email } = body

  if (!first_name || !last_name || !pin || !role_id || !zone_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
  }

  // Hash PIN via pgcrypto
  const { data: hashedPin, error: hashError } = await supabase.rpc('hash_pin', { p_pin: pin })

  if (hashError) {
    return NextResponse.json({ error: 'Failed to hash PIN' }, { status: 500 })
  }

  const finalDisplayName = display_name || `${first_name} ${last_name.charAt(0)}.`

  const { data, error } = await supabase
    .from('staff')
    .insert({
      first_name,
      last_name,
      display_name: finalDisplayName,
      pin_hash: hashedPin,
      role_id,
      zone_id,
      preferred_language: preferred_language || 'en',
      phone: phone || null,
      email: email || null,
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
  const auth = await requireManager()
  if (auth.error) return auth.error

  const supabase = await createClient()
  const body = await request.json()

  const { id, pin, ...updates } = body

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
  const auth = await requireManager()
  if (auth.error) return auth.error

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
