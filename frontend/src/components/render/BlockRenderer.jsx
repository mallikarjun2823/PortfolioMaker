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

function normalizeAlign(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'left' || v === 'center' || v === 'right') return v
  return 'left'
}

function normalizeFontStyle(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'italic') return 'italic'
  return 'normal'
}

function normalizeWeight(value) {
  const v = String(value || '').trim()
  if (['300', '400', '500', '600', '700', '800'].includes(v)) return v
  return '400'
}

function normalizePadding(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'none') return '0px'
  if (v === 'sm') return '10px'
  if (v === 'md') return '16px'
  if (v === 'lg') return '22px'
  return '0px'
}

export default function BlockRenderer({ block, index = 0 }) {
  if (!block) return null

  const type = String(block.type || '').toUpperCase()
  const items = asArray(block.items)
  const elements = asArray(block.elements)
  if (items.length === 0 && elements.length === 0) return null

  const config = block.config && typeof block.config === 'object' ? block.config : {}
  const explicitHeading = pickText(config, ['title', 'heading', 'label'])
  const autoHeading = inferHeading(type)
  const heading = explicitHeading || autoHeading
  const shouldShowHeading = config.show_title !== false && Boolean(heading)
  const styleConfig = config.style && typeof config.style === 'object' ? config.style : {}

  const blockVars = {
    '--pf-block-align': normalizeAlign(styleConfig.text_align),
    '--pf-block-font-family': String(styleConfig.font_family || '').trim() || 'inherit',
    '--pf-block-font-style': normalizeFontStyle(styleConfig.font_style),
    '--pf-block-font-weight': normalizeWeight(styleConfig.font_weight),
    '--pf-block-color': String(styleConfig.text_color || '').trim() || 'var(--pf-text)',
    '--pf-block-heading-color': String(styleConfig.heading_color || '').trim() || 'var(--pf-text)',
    '--pf-block-surface': String(styleConfig.surface_color || '').trim() || 'transparent',
    '--pf-block-border': String(styleConfig.border_color || '').trim() || 'transparent',
    '--pf-block-padding': normalizePadding(styleConfig.padding),
  }

  const headingStyle = {
    color: 'var(--pf-block-heading-color)',
    fontFamily: 'var(--pf-block-font-family)',
    fontStyle: 'var(--pf-block-font-style)',
    fontWeight: 'var(--pf-block-font-weight)',
    textAlign: 'var(--pf-block-align)',
  }

  return (
    <Reveal delay={Math.min(index * 60, 240)}>
      <div className="pfBlock" style={blockVars}>
        {shouldShowHeading ? <h3 className="pfBlockHeading" style={headingStyle}>{heading}</h3> : null}

        <div className="pfBlockBody">
          {items.length === 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
              {elements.map((element) => (
                <li key={element.id || `${element.data_source}-${element.field}-${element.order}`}>
                  <strong>{element.label || `${element.data_source}.${element.field}`}</strong>
                  <span style={{ opacity: 0.8 }}> - {String(element.data_source || '').toUpperCase()}.{element.field}</span>
                </li>
              ))}
            </ul>
          ) : type === 'GRID' ? (
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
      </div>
    </Reveal>
  )
}
