import React, { useEffect, useMemo, useState } from 'react'

import { api } from './api.js'
import { AuthContext, STORAGE_KEY } from './authContext.js'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setToken(stored || null)
    setLoading(false)
  }, [])

  const value = useMemo(() => {
    async function login({ username, password }) {
      const res = await api.login({ username, password })
      const nextToken = res?.access
      if (!nextToken) throw new Error('Login did not return an access token.')
      localStorage.setItem(STORAGE_KEY, nextToken)
      setToken(nextToken)
      return res
    }

    async function register({ username, email, password }) {
      const res = await api.register({ username, email, password })
      const nextToken = res?.access
      if (!nextToken) throw new Error('Register did not return an access token.')
      localStorage.setItem(STORAGE_KEY, nextToken)
      setToken(nextToken)
      return res
    }

    function logout() {
      localStorage.removeItem(STORAGE_KEY)
      setToken(null)
    }

    return { token, loading, login, register, logout }
  }, [token, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
