import React from 'react'

export default function EmptyState({ title = 'No data', message = 'Nothing to display yet.' }) {
  return (
    <div className="pm-empty" role="status" aria-live="polite">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
