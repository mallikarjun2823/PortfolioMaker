import React from 'react'

import { asArray, isObject, stringifyValue } from './utils.js'

function normalizeKeyValuePairs(items) {
  const pairs = []
  for (const row of asArray(items)) {
    if (!row) continue

    if (isObject(row) && 'key' in row && 'value' in row) {
      pairs.push([String(row.key || ''), row.value])
      continue
    }

    if (isObject(row) && 'label' in row && 'value' in row) {
      pairs.push([String(row.label || ''), row.value])
      continue
    }

    if (isObject(row)) {
      for (const [k, v] of Object.entries(row)) pairs.push([String(k || ''), v])
      continue
    }

    pairs.push(['', row])
  }

  return pairs
    .map(([k, v]) => [String(k || '').trim(), v])
    .filter(([, v]) => stringifyValue(v).trim())
}

export default function KeyValueBlock({ items }) {
  const pairs = normalizeKeyValuePairs(items)
  if (pairs.length === 0) return null

  return (
    <dl className="pfKeyValues">
      {pairs.map(([k, v], idx) => (
        <div key={`${k}-${idx}`} className="pfKeyValueRow">
          <dt className="pfKey">{k || '—'}</dt>
          <dd className="pfValue">{stringifyValue(v)}</dd>
        </div>
      ))}
    </dl>
  )
}
