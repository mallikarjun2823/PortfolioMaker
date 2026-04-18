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

  const match = location.pathname.match(/^\/app\/portfolios\/(\d+)(?:\/|$)/)
  const activePortfolioId = match ? match[1] : null
  const isDetailRoute = Boolean(activePortfolioId)
  const isPortfoliosListRoute = location.pathname === '/app/portfolios'

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
  }, [token])

  function onLogout() {
    logout()
    navigate('/login')
  }

  function onTopRefresh() {
    window.location.reload()
  }

  const activePortfolio = portfolios.find((p) => String(p.id) === String(activePortfolioId))

  const detailTabs = activePortfolioId
    ? [
        {
          label: 'Overview',
          to: `/app/portfolios/${activePortfolioId}`,
          isActive: (path) => path === `/app/portfolios/${activePortfolioId}`
        },
        {
          label: 'Build',
          to: `/app/portfolios/${activePortfolioId}/build`,
          isActive: (path) => path.startsWith(`/app/portfolios/${activePortfolioId}/build`)
        },
        {
          label: 'Projects',
          to: `/app/portfolios/${activePortfolioId}/projects`,
          isActive: (path) => path.startsWith(`/app/portfolios/${activePortfolioId}/projects`)
        },
        {
          label: 'Skills',
          to: `/app/portfolios/${activePortfolioId}/skills`,
          isActive: (path) => path.startsWith(`/app/portfolios/${activePortfolioId}/skills`)
        },
        {
          label: 'Experiences',
          to: `/app/portfolios/${activePortfolioId}/experiences`,
          isActive: (path) => path.startsWith(`/app/portfolios/${activePortfolioId}/experiences`)
        },
        {
          label: 'Sections',
          to: `/app/portfolios/${activePortfolioId}/sections`,
          isActive: (path) => path.startsWith(`/app/portfolios/${activePortfolioId}/sections`)
        }
      ]
    : []

  return (
    <div className={clsx('appShell', !isDetailRoute && 'appShellNoSidebar')}>
      {isDetailRoute ? (
        <aside className="sidebar">
          <div className="sidebarTop">
            <Link to="/app/portfolios" className="brand">
              Portfolios
            </Link>
            <div className="sidebarHint">
              {loadingPortfolios ? 'Loading portfolios…' : activePortfolio ? `Active: ${activePortfolio.title}` : 'Pick a portfolio'}
            </div>
          </div>

          <nav className="nav">
            <NavLink to="/app/portfolios" end className={({ isActive }) => clsx('navItem', isActive && 'active')}>
              All Portfolios
            </NavLink>
            <div className="navSectionLabel">Your Portfolios</div>
            {portfolios.map((p) => (
              <NavLink
                key={p.id}
                to={`/app/portfolios/${p.id}`}
                className={({ isActive }) => clsx('navItem', isActive && 'active')}
              >
                {p.title}
              </NavLink>
            ))}
            {!loadingPortfolios && portfolios.length === 0 ? <div className="sidebarHint">No portfolios yet.</div> : null}
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
      ) : null}

      <main className="main">
        {isPortfoliosListRoute ? (
          <div className="mainTopNav">
            <div className="mainTopNavLeft">
              <Link to="/app/portfolios" className="mainTopNavBrand">Portfolios</Link>
            </div>
            <div className="mainTopNavRight">
              <button className="btn" onClick={() => navigate('/app/portfolios?create=1')}>+ Add Portfolio</button>
              <button className="btn btnGhost" onClick={onTopRefresh}>Refresh</button>
              <button className="btn btnDanger" onClick={onLogout}>Logout</button>
            </div>
          </div>
        ) : isDetailRoute ? (
          <div className="detailTabs">
            {detailTabs.map((tab) => (
              <Link key={tab.label} to={tab.to} className={clsx('detailTab', tab.isActive(location.pathname) && 'active')}>
                {tab.label}
              </Link>
            ))}
          </div>
        ) : null}

        <Outlet />
      </main>
    </div>
  )
}
