import React, { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../services/auth.jsx'
import { api } from '../services/api.js'

function clsx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function AppLayout() {
  const { token, logout } = useAuth()
  const [portfolios, setPortfolios] = useState([])
  const [loadingPortfolios, setLoadingPortfolios] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const match = location.pathname.match(/\/app\/portfolios\/(\d+)/)
  const activePortfolioId = match ? match[1] : null

  async function loadPortfolios() {
    setLoadingPortfolios(true)
    try {
      const items = await api.listPortfolios(token)
      setPortfolios(Array.isArray(items) ? items : [])
    } finally {
      setLoadingPortfolios(false)
    }
  }

  useEffect(() => {
    loadPortfolios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onLogout() {
    logout()
    navigate('/login')
  }

  const activePortfolio = portfolios.find((p) => String(p.id) === String(activePortfolioId))

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop">
          <Link to="/app/portfolios" className="brand">
            Portfolio Builder
          </Link>
          <div className="sidebarHint">
            {loadingPortfolios ? 'Loading portfolios…' : activePortfolio ? `Active: ${activePortfolio.title}` : 'Pick a portfolio'}
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/app/portfolios" className={({ isActive }) => clsx('navItem', isActive && 'active')}>
            Portfolios
          </NavLink>

          <div className="navSectionLabel">Manage</div>
          <NavLink
            to={activePortfolioId ? `/app/portfolios/${activePortfolioId}` : '/app/portfolios'}
            className={({ isActive }) => clsx('navItem', isActive && 'active')}
          >
            Overview
          </NavLink>
          <NavLink
            to={activePortfolioId ? `/app/portfolios/${activePortfolioId}/build` : '/app/portfolios'}
            className={({ isActive }) => clsx('navItem', isActive && 'active')}
          >
            Build
          </NavLink>
          <NavLink
            to={activePortfolioId ? `/app/portfolios/${activePortfolioId}/projects` : '/app/portfolios'}
            className={({ isActive }) => clsx('navItem', isActive && 'active')}
          >
            Projects
          </NavLink>
          <NavLink
            to={activePortfolioId ? `/app/portfolios/${activePortfolioId}/skills` : '/app/portfolios'}
            className={({ isActive }) => clsx('navItem', isActive && 'active')}
          >
            Skills
          </NavLink>
          <NavLink
            to={activePortfolioId ? `/app/portfolios/${activePortfolioId}/experiences` : '/app/portfolios'}
            className={({ isActive }) => clsx('navItem', isActive && 'active')}
          >
            Experiences
          </NavLink>
        </nav>

        <div className="sidebarBottom">
          <button className="btn btnGhost" onClick={loadPortfolios}>
            Refresh portfolios
          </button>
          <button className="btn btnDanger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
