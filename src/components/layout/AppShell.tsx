'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Nav from './Nav'
import { createClient } from '@/lib/supabase/client'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [username, setUsername] = useState('')
  const supabase = createClient()

  const hideNav = pathname === '/login'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      if (profile) setUsername(profile.username)
    }
    load()
  }, [])

  return (
    <>
      {!hideNav && <Nav username={username} />}
      {children}
    </>
  )
}