import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { useAuth } from './services/auth.jsx'

import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

import AppLayout from './components/AppLayout.jsx'
import PortfoliosPage from './pages/PortfoliosPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import SkillsPage from './pages/SkillsPage.jsx'
import ExperiencesPage from './pages/ExperiencesPage.jsx'
import SectionsPage from './pages/SectionsPage.jsx'
import PortfolioOverviewPage from './pages/PortfolioOverviewPage.jsx'

function Protected({ children }) {
  const { token, loading } = useAuth()

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>
  if (!token) return <Navigate to="/login" replace />

  return children
}

export default function App() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/app/portfolios" replace /> : <Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/app"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="portfolios" element={<PortfoliosPage />} />

        <Route path="portfolios/:portfolioId" element={<PortfolioOverviewPage />} />
        <Route path="portfolios/:portfolioId/projects" element={<ProjectsPage />} />
        <Route path="portfolios/:portfolioId/skills" element={<SkillsPage />} />
        <Route path="portfolios/:portfolioId/experiences" element={<ExperiencesPage />} />
        <Route path="portfolios/:portfolioId/sections" element={<SectionsPage />} />

        <Route path="*" element={<Navigate to="/app/portfolios" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
