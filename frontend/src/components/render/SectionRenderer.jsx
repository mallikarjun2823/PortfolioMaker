import React from 'react'

import BlockRenderer from './BlockRenderer.jsx'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

export default function SectionRenderer({ section, index = 0, anchorId = null }) {
  if (!section) return null

  const blocks = asArray(section.blocks)
  if (blocks.length === 0) return null

  const id = anchorId || null

  return (
    <section id={id || undefined} className="section">
      {blocks.map((b, idx) => (
        <BlockRenderer
          key={idx}
          block={b}
          index={idx}
        />
      ))}
    </section>
  )
}
