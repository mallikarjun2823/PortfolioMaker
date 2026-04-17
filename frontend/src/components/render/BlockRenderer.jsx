import React from 'react'

import Reveal from './Reveal.jsx'

import GridBlock from './blocks/GridBlock.jsx'
import TimelineBlock from './blocks/TimelineBlock.jsx'
import ListBlock from './blocks/ListBlock.jsx'
import KeyValueBlock from './blocks/KeyValueBlock.jsx'
import ImageBlock from './blocks/ImageBlock.jsx'

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

function inferHeading(type) {
  if (type === 'GRID') return 'Projects'
  if (type === 'LIST') return 'Skills'
  if (type === 'TIMELINE') return 'Experience'
  if (type === 'KEY_VALUE') return 'About'
  if (type === 'IMAGE') return 'Gallery'
  return null
}

export default function BlockRenderer({ block, index = 0 }) {
  if (!block) return null

  const type = String(block.type || '').toUpperCase()
  const items = asArray(block.items)
  if (items.length === 0) return null

  const explicitHeading = pickText(block.config, ['title', 'heading', 'label'])
  const autoHeading = inferHeading(type)
  const heading = explicitHeading || autoHeading
  const shouldShowHeading = Boolean(heading)

  return (
    <Reveal delay={Math.min(index * 60, 240)}>
      <div className="pfBlock">
        {shouldShowHeading ? <h3 className="pfBlockHeading">{heading}</h3> : null}

        {type === 'GRID' ? (
          <GridBlock items={items} />
        ) : type === 'TIMELINE' ? (
          <TimelineBlock items={items} />
        ) : type === 'LIST' ? (
          <ListBlock items={items} />
        ) : type === 'KEY_VALUE' ? (
          <KeyValueBlock items={items} />
        ) : type === 'IMAGE' ? (
          <ImageBlock items={items} />
        ) : (
          <ListBlock items={items} />
        )}
      </div>
    </Reveal>
  )
}
