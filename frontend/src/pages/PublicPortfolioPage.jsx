import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { api, resolveAssetUrl } from '../api/client.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import Loader from '../components/Loader.jsx'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stringify(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((item) => stringify(item)).filter(Boolean).join(', ')
  if (isObject(value)) return Object.entries(value).map(([key, item]) => `${key}: ${stringify(item)}`).join(' | ')
  return String(value)
}

function isImageLike(value) {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?|#|$)/.test(normalized) || normalized.startsWith('/media/')
}

function collectImages(items) {
  const urls = []

  asArray(items).forEach((item) => {
    if (typeof item === 'string' && isImageLike(item)) {
      urls.push(resolveAssetUrl(item))
      return
    }

    if (!isObject(item)) return

    Object.values(item).forEach((value) => {
      if (typeof value === 'string' && isImageLike(value)) {
        urls.push(resolveAssetUrl(value))
      }
    })
  })

  return urls
}

function renderRecord(item) {
  if (!isObject(item)) return <p>{stringify(item)}</p>

  return (
    <dl className="pm-kvList">
      {Object.entries(item).map(([key, value]) => (
        <div key={key} className="pm-kvItem">
          <dt>{key}</dt>
          <dd>{stringify(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function renderBlockByType(block) {
  const type = String(block?.type || '').toUpperCase()
  const items = asArray(block?.items)

  if (type === 'LIST') {
    return (
      <ul className="pm-publicList">
        {items.map((item, index) => (
          <li key={index}>{stringify(item)}</li>
        ))}
      </ul>
    )
  }

  if (type === 'GRID') {
    return (
      <div className="pm-publicGrid">
        {items.map((item, index) => (
          <article key={index} className="pm-publicCard">
            {renderRecord(item)}
          </article>
        ))}
      </div>
    )
  }

  if (type === 'TIMELINE') {
    return (
      <div className="pm-publicTimeline">
        {items.map((item, index) => (
          <article key={index} className="pm-publicTimelineItem">
            {renderRecord(item)}
          </article>
        ))}
      </div>
    )
  }

  if (type === 'IMAGE') {
    const urls = collectImages(items)

    if (urls.length === 0) {
      return <EmptyState title="No images" message="This image block has no renderable URLs." />
    }

    return (
      <div className="pm-publicImageGrid">
        {urls.map((url, index) => (
          <img key={`${url}-${index}`} src={url} alt="" loading="lazy" />
        ))}
      </div>
    )
  }

  return (
    <div className="pm-pageStack">
      {items.map((item, index) => (
        <article key={index} className="pm-publicCard">
          {renderRecord(item)}
        </article>
      ))}
    </div>
  )
}

export default function PublicPortfolioPage() {
  const { slug } = useParams()

  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadPublicPortfolio() {
    setLoading(true)
    setError(null)

    try {
      const response = await api.getPublicPortfolio(slug)
      setPayload(response || null)
    } catch (err) {
      setError(err)
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPublicPortfolio()
  }, [slug])

  const portfolio = payload?.portfolio
  const sections = asArray(portfolio?.sections)

  return (
    <div className="pm-publicShell">
      <main className="pm-publicContainer">
        <header className="pm-publicHero">
          <p className="pm-publicKicker">Portfolio</p>
          <h1>{portfolio?.title || 'Untitled Portfolio'}</h1>
          {portfolio?.description ? <p>{portfolio.description}</p> : null}
        </header>

        <ErrorState error={error} onRetry={loadPublicPortfolio} />

        {loading ? <Loader label="Loading public portfolio..." /> : null}

        {!loading && !portfolio ? (
          <EmptyState title="Portfolio unavailable" message="The requested portfolio could not be loaded." />
        ) : null}

        {!loading && portfolio ? (
          <section className="pm-pageStack">
            {sections.map((section, sectionIndex) => (
              <article key={section.id || sectionIndex} className="pm-publicSection">
                <div className="pm-publicSectionTitle">
                  <h2>{section.name || `Section ${sectionIndex + 1}`}</h2>
                </div>

                <div className="pm-pageStack">
                  {asArray(section.blocks).map((block, blockIndex) => (
                    <div key={block.id || blockIndex} className="pm-publicBlock">
                      <div className="pm-rowWrap">
                        <h3>{String(block.type || 'BLOCK').toUpperCase()}</h3>
                      </div>

                      {renderBlockByType(block)}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  )
}
