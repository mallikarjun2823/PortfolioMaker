import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { toErrorMessage, useToast } from '../services/toast.jsx'
import { Button, Card, CardTitle, ErrorBanner, PageHeader, Pill } from '../components/Ui.jsx'
import PortfolioRenderer from '../components/render/PortfolioRenderer.jsx'
import { hydrateCustomRenderPayload } from '../components/render/hydrateCustomRender.js'
import TemplateRenderer from '../components/templateMode/TemplateRenderer.jsx'
import { getTemplateById, TEMPLATE_REGISTRY } from '../components/templateMode/templates.js'
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

export default function BuildPortfolioPage() {
  const { token } = useAuth()
  const toast = useToast()
  const { portfolioId } = useParams()
  const [portfolioSlug, setPortfolioSlug] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [overviewPayload, setOverviewPayload] = useState(null)
  const [customPayload, setCustomPayload] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [renderMode, setRenderMode] = useState(() => {
    try {
      const key = `pm_render_mode_${portfolioId}`
      return normalizeRenderMode(window.localStorage.getItem(key) || 'template')
    } catch {
      return 'template'
    }
  })
  const [activeTemplateId, setActiveTemplateId] = useState(() => {
    try {
      const key = `pm_template_${portfolioId}`
      return window.localStorage.getItem(key) || TEMPLATE_REGISTRY[0].id
    } catch {
      return TEMPLATE_REGISTRY[0].id
    }
  })
  const [error, setError] = useState(null)

  const isTemplateMode = renderMode !== 'custom'
  const modeQueryParams = new URLSearchParams()
  modeQueryParams.set('mode', renderMode)
  if (isTemplateMode) {
    modeQueryParams.set('template', activeTemplateId)
  }

  const modeQuery = modeQueryParams.toString()
  const sharePath = portfolioSlug ? `/p/${portfolioSlug}?${modeQuery}` : ''
  const shareUrl = sharePath ? `${window.location.origin}${sharePath}` : ''
  const ownerPreviewPath = `/app/portfolios/${portfolioId}/preview?${modeQuery}`

  async function loadPortfolioMeta() {
    const p = await api.getPortfolio(token, portfolioId)
    setPortfolioSlug(String(p?.slug || ''))
    setIsPublished(!!p?.is_published)
  }

  async function loadPreview({ silent = false, mode = renderMode } = {}) {
    const nextMode = normalizeRenderMode(mode)
    if (!silent) setPreviewLoading(true)
    try {
      if (nextMode === 'custom') {
        const [renderPayload, overview] = await Promise.all([
          api.getPortfolioRender(token, portfolioId),
          api.getPortfolioOverview(token, portfolioId),
        ])
        setOverviewPayload(overview || null)
        setCustomPayload(hydrateCustomRenderPayload(renderPayload || null, overview || null))
      } else {
        const payload = await api.getPortfolioOverview(token, portfolioId)
        setOverviewPayload(payload || null)
      }
    } finally {
      if (!silent) setPreviewLoading(false)
    }
  }

  async function copyShareLink() {
    if (!shareUrl || !isPublished) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  useEffect(() => {
    let ignore = false

    ;(async () => {
      try {
        if (renderMode === 'custom') {
          const [portfolioData, renderPayload, overviewData] = await Promise.all([
            api.getPortfolio(token, portfolioId),
            api.getPortfolioRender(token, portfolioId),
            api.getPortfolioOverview(token, portfolioId),
          ])

          if (!ignore) {
            setPortfolioSlug(String(portfolioData?.slug || ''))
            setIsPublished(!!portfolioData?.is_published)
            setOverviewPayload(overviewData || null)
            setCustomPayload(hydrateCustomRenderPayload(renderPayload || null, overviewData || null))
          }

          return
        }

        const [portfolioData, previewData] = await Promise.all([
          api.getPortfolio(token, portfolioId),
          api.getPortfolioOverview(token, portfolioId),
        ])

        if (!ignore) {
          setPortfolioSlug(String(portfolioData?.slug || ''))
          setIsPublished(!!portfolioData?.is_published)
          setOverviewPayload(previewData || null)
        }
      } catch (err) {
        if (!ignore) {
          setPortfolioSlug('')
          setIsPublished(false)
          setOverviewPayload(null)
          setCustomPayload(null)
          setError(err)
        }
      }
    })()

    return () => {
      ignore = true
    }
  }, [token, portfolioId, renderMode])

  useEffect(() => {
    if (!token || !portfolioId) return undefined

    const intervalId = window.setInterval(() => {
      if (document.hidden) return
      loadPreview({ silent: true, mode: renderMode }).catch(() => {
        // Avoid noisy UX during auto-refresh.
      })
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [token, portfolioId, renderMode])

  async function publishPortfolio() {
    setPublishing(true)
    setError(null)
    try {
      await api.updatePortfolio(token, portfolioId, { is_published: true })
      await loadPortfolioMeta()
      await loadPreview({ mode: renderMode })
      toast.success('Portfolio published. Public sharing is now enabled.')
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not publish portfolio'))
    } finally {
      setPublishing(false)
    }
  }

  const activeTemplate = getTemplateById(activeTemplateId)
  const templateData = toTemplateData(overviewPayload)

  function onRenderModeSwitch(nextMode) {
    const mode = normalizeRenderMode(nextMode)
    if (mode === renderMode) return

    setRenderMode(mode)
    try {
      const key = `pm_render_mode_${portfolioId}`
      window.localStorage.setItem(key, mode)
    } catch {
      // Non-blocking fallback for disabled storage.
    }

    loadPreview({ mode }).catch((err) => {
      setError(err)
    })
  }

  function onTemplateSwitch(nextTemplateId) {
    setActiveTemplateId(nextTemplateId)
    try {
      const key = `pm_template_${portfolioId}`
      window.localStorage.setItem(key, nextTemplateId)
    } catch {
      // Non-blocking fallback for disabled storage.
    }
  }

  return (
    <div>
      <PageHeader
        title="Build"
        subtitle="Choose Template Mode or Custom Layout mode based on how you want to design."
        right={
          <div className="row">
            <Button variant="ghost" onClick={() => loadPreview()} disabled={previewLoading}>
              {previewLoading ? 'Refreshing Preview…' : 'Refresh Preview'}
            </Button>
            <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}`}>Back to Overview</Link>
          </div>
        }
      />

      <ErrorBanner error={error} />

      <div className="buildWorkspace">
        <div className="buildEditorZone">
          <Card>
            <CardTitle>Portfolio Data Zone</CardTitle>
            <div className="subtle">Edit your content only. Templates control all layout and presentation.</div>
            <div className="divider" />
            <div className="row">
              <Link className="btn" to={`/app/portfolios/${portfolioId}/projects`}>Projects</Link>
              <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/skills`}>Skills</Link>
              <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/experiences`}>Experience</Link>
              <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/sections`}>Sections</Link>
              <Link className="btn btnGhost" to={ownerPreviewPath}>Open Full Preview</Link>
            </div>
          </Card>

          <Card>
            <CardTitle>Render Mode</CardTitle>
            <div className="subtle">Template Mode uses data-driven templates. Custom Layout uses sections, blocks, and elements.</div>
            <div className="divider" />
            <div className="row">
              <button
                type="button"
                className={`btn ${isTemplateMode ? '' : 'btnGhost'}`}
                onClick={() => onRenderModeSwitch('template')}
              >
                Standard Template
              </button>
              <button
                type="button"
                className={`btn ${!isTemplateMode ? '' : 'btnGhost'}`}
                onClick={() => onRenderModeSwitch('custom')}
              >
                Custom Layout
              </button>
            </div>
          </Card>

          <Card>
            <CardTitle>Template Mode</CardTitle>
            <div className="subtle">Switch visual templates. Data stays untouched and reusable.</div>
            <div className="divider" />
            <div className="row">
              {TEMPLATE_REGISTRY.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`btn ${activeTemplateId === template.id ? '' : 'btnGhost'}`}
                  onClick={() => onTemplateSwitch(template.id)}
                >
                  {template.name}
                </button>
              ))}
            </div>
            <div className="subtle" style={{ marginTop: 8 }}>{activeTemplate.description}</div>
          </Card>

          <Card>
            <CardTitle>Preview & Share</CardTitle>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="subtle">Public access is enabled only after publishing. Shared link keeps current render mode.</div>
              <Pill>{isPublished ? 'Published' : 'Draft'}</Pill>
            </div>
            <div className="divider" />
            {!isPublished ? (
              <Button onClick={publishPortfolio} disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish Portfolio'}
              </Button>
            ) : null}
            <div style={{ height: 10 }} />
            <div className="row" style={{ alignItems: 'stretch' }}>
              <input
                className="input"
                readOnly
                value={shareUrl || ''}
                placeholder={isPublished ? 'Share URL will appear when slug is available' : 'Publish portfolio to enable sharing'}
              />
              <button className="btn btnGhost" type="button" onClick={copyShareLink} disabled={!shareUrl || !isPublished}>Copy</button>
            </div>
          </Card>
        </div>

        <aside className="buildPreviewZone">
          <Card className="buildPreviewCard">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle>Preview Page</CardTitle>
              <Pill>{isTemplateMode ? 'Template render' : 'Custom layout render'}</Pill>
            </div>
            <div className="divider" />

            <div className="buildPreviewFrame">
              {previewLoading && !(isTemplateMode ? overviewPayload : customPayload) ? (
                <div className="subtle">Loading preview…</div>
              ) : (
                <div className="buildPreviewViewport">
                  <div
                    className={`portfolioSiteShell buildEmbeddedPreview ${isTemplateMode ? 'tmShell' : ''}`}
                    style={getThemeVariables(isTemplateMode ? overviewPayload?.portfolio : customPayload)}
                  >
                    {isTemplateMode ? (
                      <TemplateRenderer template={activeTemplate} data={templateData} />
                    ) : (
                      <PortfolioRenderer payload={customPayload} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
