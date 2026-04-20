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
import BlocksPage from './pages/BlocksPage.jsx'
import PortfolioOverviewPage from './pages/PortfolioOverviewPage.jsx'
import BuildPortfolioPage from './pages/BuildPortfolioPage.jsx'
import PortfolioRenderPage from './pages/PortfolioRenderPage.jsx'
import PortfolioDraftPreviewPage from './pages/PortfolioDraftPreviewPage.jsx'

function Protected({ children }) {
  const { token, loading } = useAuth()

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>
  if (!token) return <Navigate to="/login" replace />

  return children
}

function PublicOnly({ children }) {
  const { token, loading } = useAuth()

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>
  if (token) return <Navigate to="/app/portfolios" replace />

  return children
}

export default function App() {
  const { token } = useAuth()

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/app/portfolios" replace /> : <Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />

      <Route path="/p/:slug" element={<PortfolioRenderPage />} />
      <Route path="/portfolio/:slug" element={<PortfolioRenderPage />} />

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
        <Route path="portfolios/:portfolioId/build" element={<BuildPortfolioPage />} />
        <Route path="portfolios/:portfolioId/preview" element={<PortfolioDraftPreviewPage />} />
        <Route path="portfolios/:portfolioId/projects" element={<ProjectsPage />} />
        <Route path="portfolios/:portfolioId/skills" element={<SkillsPage />} />
        <Route path="portfolios/:portfolioId/experiences" element={<ExperiencesPage />} />
        <Route path="portfolios/:portfolioId/sections" element={<SectionsPage />} />
        <Route path="portfolios/:portfolioId/sections/:sectionId/blocks" element={<BlocksPage />} />

        <Route path="*" element={<Navigate to="/app/portfolios" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
