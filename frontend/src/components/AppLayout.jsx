import React, { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../services/auth.jsx'
import { api } from '../services/api.js'

function clsx(...parts) {
  return parts.filter(Boolean).join(' ')
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function toCssColor(value, fallback) {
  const v = String(value || '').trim()
  return v || fallback
}

function hexToRgbTriplet(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!match) return null
  let hex = match[1]
  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  const n = Number.parseInt(hex, 16)
  if (Number.isNaN(n)) return null
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `${r}, ${g}, ${b}`
}

function buildThemeVars(themeConfig) {
  const cfg = asObject(themeConfig)
  if (!cfg) return null

  const primary = toCssColor(cfg.primary_color, '#0f172a')
  const secondary = toCssColor(cfg.secondary_color, '#1e293b')
  const text = toCssColor(cfg.text_color, '#e2e8f0')
  const fontFamily = String(cfg.font_family || '').trim()

  const accentRgb = hexToRgbTriplet(secondary) || hexToRgbTriplet(primary) || '79, 70, 229'
  const textRgb = hexToRgbTriplet(text) || '226, 232, 240'

  return {
    '--bg': primary,
    '--card': secondary,
    '--text': text,
    '--muted': `rgba(${textRgb}, 0.78)`,
    '--border': `rgba(${textRgb}, 0.18)`,
    '--text-rgb': textRgb,

    '--primary': secondary,
    '--primaryHover': secondary,
    '--primary-rgb': accentRgb,
    '--primaryText': text,

    '--input-bg': `rgba(${textRgb}, 0.08)`,
    '--shadow': '0 10px 30px rgba(0, 0, 0, 0.22)',
    '--shadowHover': '0 14px 40px rgba(0, 0, 0, 0.30)',
    ...(fontFamily ? { '--app-font-family': fontFamily } : {})
  }
}

export default function AppLayout() {
  const { token, logout } = useAuth()
  const [portfolios, setPortfolios] = useState([])
  const [loadingPortfolios, setLoadingPortfolios] = useState(false)
  const [activeThemeVars, setActiveThemeVars] = useState(null)

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

  useEffect(() => {
    let ignore = false

    if (!token || !activePortfolioId) {
      setActiveThemeVars(null)
      return () => {
        ignore = true
      }
    }

    ;(async () => {
      try {
        const overview = await api.getPortfolioOverview(token, activePortfolioId)
        const vars = buildThemeVars(overview?.portfolio?.theme?.config)
        if (!ignore) {
          setActiveThemeVars(vars)
        }
      } catch {
        if (!ignore) {
          setActiveThemeVars(null)
        }
      }
    })()

    return () => {
      ignore = true
    }
  }, [token, activePortfolioId])

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
    <div className={clsx('appShell', !isDetailRoute && 'appShellNoSidebar')} style={isDetailRoute ? (activeThemeVars || undefined) : undefined}>
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
