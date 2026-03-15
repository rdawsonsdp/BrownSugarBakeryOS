import { NextResponse } from 'next/server'

/** Returns the server's current version and build ID.
 *  Clients compare against their embedded NEXT_PUBLIC_* values to detect stale code. */
export async function GET() {
  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
    buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
