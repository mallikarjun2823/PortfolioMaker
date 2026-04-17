import React from 'react'

function isHttpUrl(value) {
  if (typeof value !== 'string') return false
  return value.startsWith('http://') || value.startsWith('https://')
}

export default function Value({ value }) {
  if (value === null || value === undefined) return <span className="subtle">—</span>

  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>

  if (typeof value === 'number') return <span>{String(value)}</span>

  if (typeof value === 'string') {
    if (isHttpUrl(value)) {
      return (
        <a className="smallLink" href={value} target="_blank" rel="noreferrer">
          {value}
        </a>
      )
    }
    return <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return <pre className="code">{JSON.stringify(value, null, 2)}</pre>
  }

  return <span>{String(value)}</span>
}
