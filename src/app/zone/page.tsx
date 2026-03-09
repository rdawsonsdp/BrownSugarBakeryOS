'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect old route to new login flow
export default function ZonePageRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/login') }, [router])
  return null
}
