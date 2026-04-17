import React from 'react'

import { asArray, extractText, isObject, stringifyValue } from './utils.js'

export default function ListBlock({ items }) {
  const rows = asArray(items)
  if (rows.length === 0) return null

  const tags = rows
    .map((raw) => {
      if (typeof raw === 'string') return raw.trim()
      if (typeof raw === 'number') return String(raw)
      if (!isObject(raw)) return stringifyValue(raw)

      return (
        extractText(raw, ['skill', 'name', 'title', 'label']) ||
        extractText(raw, ['value']) ||
        ''
      )
    })
    .map((s) => String(s || '').trim())
    .filter(Boolean)

  if (tags.length === 0) return null

  return (
    <div className="pfTags" aria-label="Skills">
      {tags.map((t, idx) => (
        <span key={`${t}-${idx}`} className="tag">{t}</span>
      ))}
    </div>
  )
}
