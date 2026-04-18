import React from 'react'

import { asArray, extractText, isObject, stringifyValue } from './utils.js'

function firstPrimitiveText(obj) {
  if (!isObject(obj)) return ''
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

export default function ListBlock({ items }) {
  const rows = asArray(items)
  if (rows.length === 0) return null

  const tags = rows
    .map((raw) => {
      if (typeof raw === 'string') return raw.trim()
      if (typeof raw === 'number') return String(raw)
      if (!isObject(raw)) return stringifyValue(raw)

      return (
        extractText(raw, ['skill', 'skills', 'skill name', 'skill_name', 'skillname', 'name', 'title', 'label']) ||
        extractText(raw, ['value', 'text']) ||
        firstPrimitiveText(raw) ||
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
