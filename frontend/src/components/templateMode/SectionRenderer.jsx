import React from 'react'

import BlockRenderer from './BlockRenderer.jsx'

function normalizeItems(sourceValue) {
  if (Array.isArray(sourceValue)) return sourceValue
  if (sourceValue && typeof sourceValue === 'object') return sourceValue
  return []
}

export default function SectionRenderer({ section, data }) {
  const sourceKey = String(section?.data_source || '').toUpperCase()
  const sourceValue = data?.[sourceKey]
  const items = normalizeItems(sourceValue)

  return (
    <section className="tmSection">
      <BlockRenderer section={section} items={items} />
    </section>
  )
}
