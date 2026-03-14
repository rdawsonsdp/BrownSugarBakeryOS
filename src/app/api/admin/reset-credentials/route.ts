import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { backup_email, new_email, new_password } = await request.json()

    if (!backup_email || !new_email || !new_password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.rpc('reset_admin_credentials', {
      p_backup_email: backup_email,
      p_new_email: new_email,
      p_new_password: new_password,
    })

    if (error) {
      const message = error.message.includes('Invalid recovery email')
        ? 'Invalid recovery email'
        : 'Failed to reset credentials'
      return NextResponse.json({ error: message }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
