import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session on every request
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // TODO: Re-enable admin auth check when login is required
  // Protect /admin/* routes (except /admin/login)
  // const { pathname } = request.nextUrl
  // if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !pathname.startsWith('/admin/reset')) {
  //   if (!user) {
  //     const loginUrl = request.nextUrl.clone()
  //     loginUrl.pathname = '/admin/login'
  //     return NextResponse.redirect(loginUrl)
  //   }
  // }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/).*)'],
}
