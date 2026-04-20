import React, { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { ErrorBanner } from '../components/Ui.jsx'
import PortfolioRenderer from '../components/render/PortfolioRenderer.jsx'
import { hydrateCustomRenderPayload } from '../components/render/hydrateCustomRender.js'
import TemplateRenderer from '../components/templateMode/TemplateRenderer.jsx'
import { getTemplateById } from '../components/templateMode/templates.js'
import { toTemplateData } from '../components/templateMode/data.js'

function normalizeThemeAlign(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'left' || v === 'center' || v === 'right') return v
  return 'left'
}

function normalizeRenderMode(value) {
  return String(value || '').trim().toLowerCase() === 'custom' ? 'custom' : 'template'
}

function getThemeVariables(payload) {
  const cfg = payload?.theme?.config && typeof payload.theme.config === 'object'
    ? payload.theme.config
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

export default function PortfolioDraftPreviewPage() {
  const { token } = useAuth()
  const { portfolioId } = useParams()
  const [searchParams] = useSearchParams()

  const [overviewPayload, setOverviewPayload] = useState(null)
  const [customPayload, setCustomPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [renderMode, setRenderMode] = useState('template')
  const [templateId, setTemplateId] = useState('minimal')
  const rawModeFromQuery = String(searchParams.get('mode') || '').trim()
  const modeFromQuery = rawModeFromQuery ? normalizeRenderMode(rawModeFromQuery) : ''
  const templateFromQuery = String(searchParams.get('template') || '').trim()
  const isTemplateMode = renderMode !== 'custom'

  async function load() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      if (renderMode === 'custom') {
        const [renderRes, overviewRes] = await Promise.all([
          api.getPortfolioRender(token, portfolioId),
          api.getPortfolioOverview(token, portfolioId),
        ])
        setOverviewPayload(overviewRes || null)
        setCustomPayload(hydrateCustomRenderPayload(renderRes || null, overviewRes || null))
      } else {
        const res = await api.getPortfolioOverview(token, portfolioId)
        setOverviewPayload(res || null)
      }
    } catch (err) {
      setError(err)
      setOverviewPayload(null)
      setCustomPayload(null)
    } finally {
      setLoading(false)
    }
  }

  function onSwitchMode(nextMode) {
    const mode = normalizeRenderMode(nextMode)
    setRenderMode(mode)
    try {
      const modeKey = `pm_render_mode_${portfolioId}`
      window.localStorage.setItem(modeKey, mode)
    } catch {
      // Keep runtime state only.
    }
  }

  useEffect(() => {
    const modeKey = `pm_render_mode_${portfolioId}`

    if (modeFromQuery) {
      setRenderMode(modeFromQuery)
      try {
        window.localStorage.setItem(modeKey, modeFromQuery)
      } catch {
        // Keep runtime state only.
      }
      return
    }

    try {
      const saved = window.localStorage.getItem(modeKey)
      if (saved) setRenderMode(normalizeRenderMode(saved))
    } catch {
      // Keep default mode.
    }
  }, [portfolioId, modeFromQuery])

  useEffect(() => {
    const key = `pm_template_${portfolioId}`

    if (templateFromQuery) {
      setTemplateId(templateFromQuery)
      try {
        window.localStorage.setItem(key, templateFromQuery)
      } catch {
        // Keep runtime state only.
      }
      return
    }

    try {
      const saved = window.localStorage.getItem(key)
      if (saved) setTemplateId(saved)
    } catch {
      // Keep default template.
    }
  }, [portfolioId, templateFromQuery])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, portfolioId, renderMode])

  const template = getTemplateById(templateId)
  const data = toTemplateData(overviewPayload)

  return (
    <div
      className={`portfolioSiteShell ${isTemplateMode ? 'tmShell' : ''}`}
      style={getThemeVariables(isTemplateMode ? overviewPayload?.portfolio : customPayload)}
    >
      <div className="portfolioTopbar">
        <button
          className={`siteButton ${isTemplateMode ? '' : 'siteButtonGhost'}`}
          onClick={() => onSwitchMode('template')}
          disabled={loading}
        >
          Template
        </button>
        <button
          className={`siteButton ${!isTemplateMode ? '' : 'siteButtonGhost'}`}
          onClick={() => onSwitchMode('custom')}
          disabled={loading}
        >
          Custom Layout
        </button>
        <Link className="siteButton siteButtonGhost" to={`/app/portfolios/${portfolioId}/build`}>
          Back to Build
        </Link>
        <button className="siteButton" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      <ErrorBanner error={error} />

      {loading ? (
        <div className="portfolioLoading">Loading your portfolio…</div>
      ) : (
        isTemplateMode ? <TemplateRenderer template={template} data={data} /> : <PortfolioRenderer payload={customPayload} />
      )}
    </div>
  )
}
