'use client'
// ============================================================
// PROFILE PAGE — /profile
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './profile.module.css'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUsername(profile.username)
        setNewUsername(profile.username)
      }

      setLoading(false)
    }

    load()
  }, [])

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername }),
    })

    const data = await res.json()

    if (!res.ok) {
      setSaveError(data.error || 'Failed to save')
    } else {
      setUsername(newUsername)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }

    setSaving(false)
  }

  async function handleDeleteAccount() {
    // Require them to type their username to confirm
    if (deleteConfirm !== username) {
      setDeleteError(`Type your username "${username}" exactly to confirm`)
      return
    }

    setDeleting(true)
    setDeleteError('')

    const res = await fetch('/api/profile', { method: 'DELETE' })

    if (!res.ok) {
      const data = await res.json()
      setDeleteError(data.error || 'Failed to delete account')
      setDeleting(false)
      return
    }

    // Sign out and redirect to login
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div>
      <div className="loading">Loading profile...</div>
    </div>
  )

  return (
    <div>
      <main className="container">
        <div className={styles.pageHeader}>
          <h1>Profile Settings</h1>
          <p className={styles.subtitle}>{email}</p>
        </div>

        {/* ---- Change Username ---- */}
        <div className={`card ${styles.section}`}>
          <h3>Display Name</h3>
          <p className={styles.sectionDesc}>
            This is the name shown on the leaderboard and to other players.
          </p>
          <form onSubmit={handleSaveUsername} className={styles.form}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                maxLength={30}
                minLength={2}
                required
              />
            </div>
            {saveError && <div className="error-box">{saveError}</div>}
            {saveSuccess && (
              <div className="success-box">✓ Username updated successfully</div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || newUsername === username}
            >
              {saving ? 'Saving...' : 'Save Username'}
            </button>
          </form>
        </div>

        {/* ---- Danger Zone ---- */}
        <div className={`card ${styles.section} ${styles.dangerZone}`}>
          <h3 className={styles.dangerTitle}>Delete Account</h3>
          <p className={styles.sectionDesc}>
            This permanently deletes your account, all your predictions, and
            removes you from all leagues. This cannot be undone.
          </p>
          <div className="form-group">
            <label>Type <strong style={{ color: 'var(--white)' }}>{username}</strong> to confirm</label>
            <input
              type="text"
              placeholder={username}
              value={deleteConfirm}
              onChange={e => { setDeleteConfirm(e.target.value); setDeleteError('') }}
            />
          </div>
          {deleteError && <div className="error-box">{deleteError}</div>}
          <button
            className="btn btn-danger"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete My Account'}
          </button>
        </div>
      </main>
    </div>
  )
}