import React from 'react'

import Reveal from './Reveal.jsx'
import SectionRenderer from './SectionRenderer.jsx'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizePairsFromKeyValueBlocks(sections) {
  const pairs = []
  for (const section of sections) {
    const blocks = asArray(section?.blocks)
    for (const block of blocks) {
      if (String(block?.type || '').toUpperCase() !== 'KEY_VALUE') continue
      const items = asArray(block?.items)
      for (const row of items) {
        if (!isObject(row)) continue
        if ('key' in row && 'value' in row) {
          pairs.push([String(row.key || ''), row.value])
          continue
        }
        if ('label' in row && 'value' in row) {
          pairs.push([String(row.label || ''), row.value])
          continue
        }
        for (const [k, v] of Object.entries(row)) pairs.push([String(k || ''), v])
      }
    }
  }
  return pairs
}

function pickFirstByKey(pairs, keys) {
  const wanted = keys.map((k) => String(k).toLowerCase())
  for (const [k, v] of pairs) {
    const key = String(k || '').toLowerCase().trim()
    if (!key) continue
    if (wanted.includes(key)) {
      const value = typeof v === 'string' ? v.trim() : v
      if (typeof value === 'string' && value) return value
    }
  }
  return null
}

function containsAnyKey(pairs, keys) {
  const wanted = new Set(keys.map((k) => String(k).toLowerCase()))
  return pairs.some(([k]) => wanted.has(String(k || '').toLowerCase().trim()))
}

function scrollToId(id) {
  if (!id) return
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function PortfolioRenderer({ payload }) {
  const portfolio = payload?.portfolio
  const sections = asArray(portfolio?.sections)

  const pairs = normalizePairsFromKeyValueBlocks(sections)
  const tagline = pickFirstByKey(pairs, ['tagline', 'headline', 'role', 'title', 'position'])

  let projectsSectionIndex = -1
  for (let i = 0; i < sections.length; i++) {
    const blocks = asArray(sections[i]?.blocks)
    if (blocks.some((b) => String(b?.type || '').toUpperCase() === 'GRID')) {
      projectsSectionIndex = i
      break
    }
  }

  let contactSectionIndex = -1
  for (let i = 0; i < sections.length; i++) {
    const p = normalizePairsFromKeyValueBlocks([sections[i]])
    if (containsAnyKey(p, ['email', 'phone', 'linkedin', 'github', 'contact'])) {
      contactSectionIndex = i
      break
    }
  }

  if (!portfolio) {
    return (
      <div className="portfolioSite">
        <div className="portfolioContainer">
          <div className="siteEmpty">No portfolio payload returned.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="portfolioSite">
      <div className="portfolioBg" aria-hidden="true" />

      <header className="pfHero">
        <Reveal>
          <div className="pfHeroInner">
            <div className="pfHeroKicker">Hi, I’m</div>
            <h1 className="pfHeroTitle">{portfolio.title || 'Your Name'}</h1>
            {tagline ? <div className="pfHeroTagline">{tagline}</div> : null}
            {portfolio.description ? <p className="pfHeroDesc">{portfolio.description}</p> : null}

            <div className="pfHeroActions">
              {projectsSectionIndex >= 0 ? (
                <button className="siteButton" onClick={() => scrollToId('projects')}>View Projects</button>
              ) : null}
              {contactSectionIndex >= 0 ? (
                <button className="siteButton siteButtonGhost" onClick={() => scrollToId('contact')}>Contact</button>
              ) : null}
            </div>
          </div>
        </Reveal>
      </header>

      {sections.map((section, idx) => (
        <SectionRenderer
          key={idx}
          section={section}
          index={idx}
          anchorId={
            idx === projectsSectionIndex
              ? 'projects'
              : idx === contactSectionIndex
                ? 'contact'
                : null
          }
        />
      ))}
    </div>
  )
}
