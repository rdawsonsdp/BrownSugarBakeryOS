import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const { shift_id, notes } = await request.json()

    if (!shift_id) {
      return NextResponse.json({ error: 'shift_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('shifts')
      .update({ notes: notes || null })
      .eq('id', shift_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Shift notes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
