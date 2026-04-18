import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { ErrorBanner } from '../components/Ui.jsx'
import PortfolioRenderer from '../components/render/PortfolioRenderer.jsx'

function normalizeThemeAlign(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'left' || v === 'center' || v === 'right') return v
  return 'left'
}

function getThemeVariables(payload) {
  const cfg = payload?.portfolio?.theme?.config && typeof payload.portfolio.theme.config === 'object'
    ? payload.portfolio.theme.config
    : {}

  const primary = String(cfg.primary_color || '').trim() || '#0f172a'
  const secondary = String(cfg.secondary_color || '').trim() || '#1e293b'
  const text = String(cfg.text_color || '').trim() || '#e2e8f0'
  const fontFamily = String(cfg.font_family || '').trim() || '"Segoe UI", Tahoma, sans-serif'
  const align = normalizeThemeAlign(cfg.alignment)

  return {
    '--pf-bg': primary,
    '--pf-card': secondary,
    '--pf-text': text,
    '--pf-muted': text,
    '--pf-accent': secondary,
    '--pf-font-family': fontFamily,
    '--pf-align': align,
  }
}

export default function PortfolioRenderPage() {
  const { token } = useAuth()
  const { slug } = useParams()

  const [payload, setPayload] = useState(null)
  const [portfolioId, setPortfolioId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.renderPortfolioPublicBySlug(slug)
      setPayload(res || null)

      if (token) {
        try {
          const portfolios = await api.listPortfolios(token)
          const match = (Array.isArray(portfolios) ? portfolios : []).find(
            (p) => String(p?.slug || '') === String(slug || '')
          )
          setPortfolioId(match?.id || null)
        } catch {
          setPortfolioId(null)
        }
      } else {
        setPortfolioId(null)
      }
    } catch (err) {
      setError(err)
      setPayload(null)
      setPortfolioId(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return (
    <div className="portfolioSiteShell" style={getThemeVariables(payload)}>
      <div className="portfolioTopbar">
        {portfolioId ? (
          <Link className="siteButton siteButtonGhost" to={`/app/portfolios/${portfolioId}/build`}>
            Back to Build
          </Link>
        ) : token ? (
          <Link className="siteButton siteButtonGhost" to="/app/portfolios">
            Back to Portfolios
          </Link>
        ) : null}
        <button className="siteButton" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      <ErrorBanner error={error} />

      {loading ? (
        <div className="portfolioLoading">Loading your portfolio…</div>
      ) : (
        <PortfolioRenderer payload={payload} />
      )}
    </div>
  )
}
