import React from 'react'

function pickFirstString(obj, candidates) {
  if (!obj || typeof obj !== 'object') return ''
  for (const key of candidates) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export default function HeroBlock({ item }) {
  const source = item && typeof item === 'object' && !Array.isArray(item) ? item : {}

  const title = pickFirstString(source, ['title', 'name']) || 'Your Portfolio'
  const subtitle = pickFirstString(source, ['slug'])
  const description = pickFirstString(source, ['description'])

  return (
    <header className="tmHero">
      <h1 className="tmHeroTitle">{title}</h1>
      {subtitle ? <div className="tmHeroSubtitle">{subtitle}</div> : null}
      {description ? <p className="tmHeroDescription">{description}</p> : null}
    </header>
  )
}
