import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../services/auth.jsx'
import { Button, Card, ErrorBanner, Field, Input, PageHeader } from '../components/Ui.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ username, password })
      navigate('/app/portfolios')
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authShell">
      <Card className="authCard">
        <PageHeader title="Welcome back" subtitle="Sign in to manage your portfolios." />
        <ErrorBanner error={error} />

        <form onSubmit={onSubmit}>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your username" autoComplete="username" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </Field>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Button type="submit" disabled={loading || !username || !password}>
              {loading ? 'Signing in…' : 'Login'}
            </Button>
            <Link to="/register" className="smallLink">
              Create account
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
