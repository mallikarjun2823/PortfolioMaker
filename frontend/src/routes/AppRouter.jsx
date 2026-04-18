import React from 'react'
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import Loader from '../components/Loader.jsx'
import { useAuth } from '../services/auth.js'

import LoginPage from '../pages/LoginPage.jsx'
import PortfolioListPage from '../pages/PortfolioListPage.jsx'
import PortfolioDetailPage from '../pages/PortfolioDetailPage.jsx'
import PublicPortfolioPage from '../pages/PublicPortfolioPage.jsx'

function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) return <Loader label="Checking session..." />
  if (!isAuthenticated()) return <Navigate to="/login" replace />

  return children
}

function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) return <Loader label="Loading..." />
  if (isAuthenticated()) return <Navigate to="/app/portfolios" replace />

  return children
}

function ProtectedLayout() {
  const { logout } = useAuth()

  return (
    <div className="pm-app">
      <header className="pm-shellHeader">
        <div className="pm-shellHeaderInner">
          <Link className="pm-brand" to="/app/portfolios">
            Portfolio Maker
          </Link>

          <button type="button" className="pm-btn pm-btnSecondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="pm-container">
        <Outlet />
      </main>
    </div>
  )
}

export default function AppRouter() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated() ? '/app/portfolios' : '/login'} replace />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route path="/p/:slug" element={<PublicPortfolioPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="portfolios" element={<PortfolioListPage />} />
        <Route path="portfolios/:portfolioId" element={<PortfolioDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
