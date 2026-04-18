import React from 'react'

function getTitle(status) {
  if (status === 401) return 'Session expired'
  if (status === 403) return 'Permission denied'
  if (status >= 500) return 'Server error'
  return 'Something went wrong'
}

function getMessage(status, fallback) {
  if (status === 401) return 'Please sign in again to continue.'
  if (status === 403) return 'You do not have permission to access this resource.'
  if (status >= 500) return 'The server had an issue. Try again in a moment.'
  if (fallback) return fallback
  return 'Please try again.'
}

export default function ErrorState({ error, onRetry }) {
  if (!error) return null

  const status = Number(error?.status) || 0

  return (
    <div className="pm-error" role="alert">
      <h3>{getTitle(status)}</h3>
      <p>{getMessage(status, error?.message)}</p>
      {onRetry ? (
        <button type="button" className="pm-btn pm-btnSecondary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}
