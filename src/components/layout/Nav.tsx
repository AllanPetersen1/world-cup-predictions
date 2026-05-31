'use client'
// ============================================================
// NAVIGATION BAR
// ============================================================
// Appears at the top of all authenticated pages.
// Shows current page, username, and logout button.
// ============================================================

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './Nav.module.css'

interface NavProps {
  username?: string
}

export default function Nav({ username }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/matches', label: 'Matches' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/leagues', label: 'Leagues'}
  ]

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link href="/matches" className={styles.logo}>
          Home
        </Link>

        {/* Nav links */}
        <div className={styles.links}>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.link} ${pathname === link.href ? styles.linkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* User + logout */}
        <div className={styles.user}>
          {username && (
            <a href="/profile" className={styles.username}>{username}</a>
          )}
          <button onClick={handleLogout} className={`btn btn-sm btn-secondary ${styles.logoutBtn}`}>
            Log out
          </button>
        </div>
      </div>
    </nav>
  )
}
