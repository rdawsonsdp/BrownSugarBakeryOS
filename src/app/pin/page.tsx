'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect old route to new login flow
export default function PinPageRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/login') }, [router])
  return null
}
