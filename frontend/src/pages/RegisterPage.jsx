import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../services/auth.jsx'
import { Button, Card, ErrorBanner, Field, Input, PageHeader } from '../components/Ui.jsx'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register({ username, email: email || '', password })
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
        <PageHeader title="Create account" subtitle="Register and start building portfolios." />
        <ErrorBanner error={error} />

        <form onSubmit={onSubmit}>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="choose a username" autoComplete="username" />
          </Field>
          <Field label="Email (optional)">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 8 characters" autoComplete="new-password" />
          </Field>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Button type="submit" disabled={loading || !username || password.length < 8}>
              {loading ? 'Creating…' : 'Register'}
            </Button>
            <Link to="/login" className="smallLink">
              Back to login
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
