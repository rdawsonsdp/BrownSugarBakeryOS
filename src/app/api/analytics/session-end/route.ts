import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Called via sendBeacon on page unload to update login_sessions.logged_out_at.
 * Accepts JSON body with shift_id.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shift_id } = body

    if (!shift_id) {
      return NextResponse.json({ error: 'shift_id required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Update the most recent login_session for this shift
    await supabase
      .from('login_sessions')
      .update({ logged_out_at: new Date().toISOString() })
      .eq('shift_id', shift_id)
      .is('logged_out_at', null)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
