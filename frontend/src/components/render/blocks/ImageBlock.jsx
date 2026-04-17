import React from 'react'

import { asArray, isObject, looksLikeImageUrl } from './utils.js'

export default function ImageBlock({ items }) {
  const rows = asArray(items)
  const urls = []

  for (const row of rows) {
    if (typeof row === 'string' && looksLikeImageUrl(row)) urls.push(row)
    if (!isObject(row)) continue
    for (const v of Object.values(row)) {
      if (typeof v === 'string' && looksLikeImageUrl(v)) urls.push(v)
    }
  }

  if (urls.length === 0) return null

  return (
    <div className="pfImages" aria-label="Images">
      {urls.slice(0, 12).map((src, idx) => (
        <img key={`${src}-${idx}`} className="pfImage" src={src} alt="" loading="lazy" />
      ))}
    </div>
  )
}
