import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ErrorState from '../components/ErrorState.jsx'
import { useAuth } from '../services/auth.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function submitLogin(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login({ username, password })
      navigate('/app/portfolios', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pm-authShell">
      <form className="pm-authCard" onSubmit={submitLogin}>
        <p className="pm-authKicker">Portfolio Maker</p>
        <h1>Sign in</h1>
        <p>Use your account to manage portfolios and publish dynamic pages.</p>

        <ErrorState error={error} />

        <div className="pm-field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            className="pm-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="pm-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="pm-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="pm-btn" disabled={submitting || !username || !password}>
          {submitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
