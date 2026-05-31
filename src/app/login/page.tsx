'use client'
// ============================================================
// LOGIN / SIGNUP PAGE
// ============================================================
// "use client" means this component runs in the browser.
// It handles user authentication via Supabase.
// ============================================================

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // Toggle between login and sign-up modes
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      // ---- SIGN UP ----
      if (username.trim().length < 2) {
        setError('Username must be at least 2 characters')
        setLoading(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          data: { username: username.trim() }, // Stored in user metadata
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else if (data.user && !data.session) {
        // Email confirmation required
        setMessage('Check your email to confirm your account!')
      } else if (data.session) {
        // Auto-confirmed (happens when email confirmations are disabled in Supabase)
        router.push('/matches')
        router.refresh()
      }

    } else {
      // ---- LOG IN ----
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
      } else {
        router.push('/matches')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <div className={styles.page}>
      {/* Background decoration */}
      <div className={styles.bg}>
        <div className={styles.bgCircle1} />
        <div className={styles.bgCircle2} />
        <div className={styles.fieldLines} />
      </div>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Petersens Predictor</h1>
          <p className={styles.subtitle}>World Cup 2026</p>
        </div>

        {/* Auth card */}
        <div className={`card ${styles.card}`}>
          {/* Mode toggle */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => { setMode('login'); setError(''); setMessage('') }}
            >
              Log In
            </button>
            <button
              className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
              onClick={() => { setMode('signup'); setError(''); setMessage('') }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Username (signup only) */}
            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="username">Display Name</label>
                <input
                  id="username"
                  type="text"
                  placeholder="e.g. Messi_Fan_99"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  maxLength={30}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-box">{error}</div>}
            {message && <div className="success-box">{message}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login' ? 'Log In' : 'Create Account'
              }
            </button>
          </form>

          <p className={styles.switchMode}>
            {mode === 'login' ? "No account yet? " : "Already have one? "}
            <button
              className={styles.switchBtn}
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            >
              {mode === 'login' ? 'Sign up free' : 'Log in'}
            </button>
          </p>
        </div>

        {/* Scoring info */}
        <div className={styles.scoringInfo}>
          <div className={styles.scoringRow}>
            <span className="points-badge points-3">+3</span>
            <span>Exact score correct</span>
          </div>
          <div className={styles.scoringRow}>
            <span className="points-badge points-1">+1</span>
            <span>Correct result (win/draw)</span>
          </div>
          <div className={styles.scoringRow}>
            <span className="points-badge points-0">+0</span>
            <span>Wrong prediction</span>
          </div>
        </div>
      </div>
    </div>
  )
}
