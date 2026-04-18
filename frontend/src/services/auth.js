import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

import {
  api,
  clearToken,
  getToken,
  setToken,
  setUnauthorizedHandler
} from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTokenState(getToken())
    setLoading(false)

    const onUnauthorized = () => {
      clearToken()
      setTokenState(null)
    }

    setUnauthorizedHandler(onUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo(() => {
    async function login({ username, password }) {
      const response = await api.login({ username, password })
      const accessToken = response?.access

      if (!accessToken) {
        throw new Error('Login succeeded but no access token was returned.')
      }

      setToken(accessToken)
      setTokenState(accessToken)
      return response
    }

    function logout() {
      clearToken()
      setTokenState(null)
    }

    function isAuthenticated() {
      return Boolean(token)
    }

    return {
      token,
      loading,
      login,
      logout,
      isAuthenticated
    }
  }, [token, loading])

  return React.createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
