import React from 'react'

export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="pm-loader" role="status" aria-live="polite">
      <span className="pm-loaderSpinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
