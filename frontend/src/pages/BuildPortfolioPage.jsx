import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { toErrorMessage, useToast } from '../services/toast.jsx'
import { Button, Card, CardTitle, ErrorBanner, PageHeader, Pill } from '../components/Ui.jsx'

export default function BuildPortfolioPage() {
  const { token } = useAuth()
  const toast = useToast()
  const { portfolioId } = useParams()
  const [portfolioSlug, setPortfolioSlug] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState(null)

  const sharePath = portfolioSlug ? `/portfolio/${portfolioSlug}` : ''
  const shareUrl = sharePath ? `${window.location.origin}${sharePath}` : ''

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
        const p = await api.getPortfolio(token, portfolioId)
        if (!ignore) {
          setPortfolioSlug(String(p?.slug || ''))
          setIsPublished(!!p?.is_published)
        }
      } catch {
        if (!ignore) {
          setPortfolioSlug('')
          setIsPublished(false)
        }
      }
    })()
    return () => {
      ignore = true
    }
  }, [token, portfolioId])

  async function publishPortfolio() {
    setPublishing(true)
    setError(null)
    try {
      await api.updatePortfolio(token, portfolioId, { is_published: true })
      setIsPublished(true)
      toast.success('Portfolio published. Public sharing is now enabled.')
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not publish portfolio'))
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Build"
        subtitle="Layout and preview. Sections live here (not in the main tabs)."
        right={<Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}`}>Back to Overview</Link>}
      />

      <ErrorBanner error={error} />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Card>
          <CardTitle>Sections</CardTitle>
          <div className="subtle">Control ordering, visibility, and config.</div>
          <div className="divider" />
          <Link className="btn" to={`/app/portfolios/${portfolioId}/sections`}>Edit Sections</Link>
        </Card>

        <Card>
          <CardTitle>Preview & Share</CardTitle>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="subtle">Anyone with this link can view the portfolio without login, but only after publishing.</div>
            <Pill>{isPublished ? 'Published' : 'Draft'}</Pill>
          </div>
          <div className="divider" />
          {!isPublished ? (
            <Button onClick={publishPortfolio} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish Portfolio'}
            </Button>
          ) : null}
          <div style={{ height: 10 }} />
          <Link className="btn" to={isPublished && sharePath ? sharePath : `/app/portfolios/${portfolioId}`}>
            Open Preview
          </Link>
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
    </div>
  )
}
