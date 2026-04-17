import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { ErrorBanner } from '../components/Ui.jsx'
import PortfolioRenderer from '../components/render/PortfolioRenderer.jsx'

export default function PortfolioRenderPage() {
  const { token } = useAuth()
  const { portfolioId } = useParams()

  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.renderPortfolio(token, portfolioId)
      setPayload(res || null)
    } catch (err) {
      setError(err)
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId])

  return (
    <div className="portfolioSiteShell">
      <div className="portfolioTopbar">
        <Link className="siteButton siteButtonGhost" to={`/app/portfolios/${portfolioId}/build`}>Back to Build</Link>
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
