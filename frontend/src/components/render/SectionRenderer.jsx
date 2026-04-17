import React from 'react'

import Reveal from './Reveal.jsx'
import BlockRenderer from './BlockRenderer.jsx'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function pickText(config, keys) {
  if (!config || typeof config !== 'object') return null
  for (const k of keys) {
    const v = config[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function SectionRenderer({ section, index = 0, anchorId = null }) {
  if (!section) return null

  const blocks = asArray(section.blocks)
  if (blocks.length === 0) return null

  const title = pickText(section.config, ['title', 'heading']) || section.name || 'Section'
  const subtitle = pickText(section.config, ['subtitle', 'description', 'intro'])
  const id = anchorId || slugify(section.name || title) || `section-${index}`

  return (
    <section id={id} className="siteSection">
      <Reveal>
        <header className="sectionHeader">
          <h2 className="sectionTitle">{title}</h2>
          {subtitle ? <p className="sectionSubtitle">{subtitle}</p> : null}
        </header>
      </Reveal>

      <div className="sectionBody">
        {blocks.map((b, idx) => (
          <BlockRenderer key={idx} block={b} index={idx} />
        ))}
      </div>
    </section>
  )
}
