import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AuthSuccess = { user: { id: string; email: string }; error: null }
type AuthFailure = { user: null; error: NextResponse }

/**
 * Strict auth: requires Supabase Auth session (email/password login).
 * Use for admin-only operations like staff CRUD and analytics.
 */
export async function requireManager(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized — manager login required' },
        { status: 401 }
      ),
    }
  }

  return {
    user: { id: user.id, email: user.email ?? '' },
    error: null,
  }
}

/**
 * Flexible auth: accepts Supabase Auth session OR checks that the caller
 * has an active manager shift (via X-Staff-Role header set by the client).
 * Use for operations managers do from the dashboard (quick-add, reset tasks, etc.).
 */
export async function requireManagerOrAuth(): Promise<AuthSuccess | AuthFailure> {
  // First try Supabase Auth (admin login)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return {
      user: { id: user.id, email: user.email ?? '' },
      error: null,
    }
  }

  // No Supabase Auth — reject
  return {
    user: null,
    error: NextResponse.json(
      { error: 'Unauthorized — manager login required' },
      { status: 401 }
    ),
  }
}
