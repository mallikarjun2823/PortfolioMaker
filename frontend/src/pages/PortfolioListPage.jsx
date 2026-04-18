import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../api/client.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import Loader from '../components/Loader.jsx'

export default function PortfolioListPage() {
  const [portfolios, setPortfolios] = useState([])
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function loadPortfolios() {
    setLoading(true)
    setError(null)

    try {
      const response = await api.listPortfolios()
      setPortfolios(Array.isArray(response) ? response : [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPortfolios()
  }, [])

  async function createPortfolio(event) {
    event.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    setError(null)

    try {
      await api.createPortfolio({
        title: title.trim(),
        slug: slug.trim() || undefined
      })

      setTitle('')
      setSlug('')
      await loadPortfolios()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="pm-pageStack">
      <div className="pm-pageHeading">
        <div>
          <h1>Portfolios</h1>
          <p>Manage your backend-driven portfolio records.</p>
        </div>
      </div>

      <form className="pm-card pm-formGrid" onSubmit={createPortfolio}>
        <div className="pm-field">
          <label htmlFor="portfolio-title">Portfolio title</label>
          <input
            id="portfolio-title"
            className="pm-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Senior Frontend Engineer"
            required
          />
        </div>

        <div className="pm-field">
          <label htmlFor="portfolio-slug">Slug (optional)</label>
          <input
            id="portfolio-slug"
            className="pm-input"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="senior-frontend-engineer"
          />
        </div>

        <div className="pm-formActions">
          <button type="submit" className="pm-btn" disabled={saving || !title.trim()}>
            {saving ? 'Creating...' : 'Create portfolio'}
          </button>
        </div>
      </form>

      <ErrorState error={error} onRetry={loadPortfolios} />

      {loading ? <Loader label="Loading portfolios..." /> : null}

      {!loading && portfolios.length === 0 ? (
        <EmptyState title="No portfolios found" message="Create your first portfolio to get started." />
      ) : null}

      {!loading && portfolios.length > 0 ? (
        <div className="pm-grid">
          {portfolios.map((portfolio) => (
            <article key={portfolio.id} className="pm-card pm-cardStack">
              <div className="pm-cardHeader">
                <h2>{portfolio.title}</h2>
                <span className={`pm-pill ${portfolio.is_published ? 'is-live' : ''}`}>
                  {portfolio.is_published ? 'Published' : 'Draft'}
                </span>
              </div>

              <p className="pm-subtle">/{portfolio.slug || 'no-slug'}</p>

              <div className="pm-row">
                <Link className="pm-btn pm-btnSecondary" to={`/app/portfolios/${portfolio.id}`}>
                  Open builder
                </Link>

                {portfolio.slug ? (
                  <Link className="pm-btn pm-btnGhost" to={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">
                    View public page
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
