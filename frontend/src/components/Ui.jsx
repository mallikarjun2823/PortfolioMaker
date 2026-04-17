import React from 'react'

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="pageHeader">
      <div>
        <h1 className="h1">{title}</h1>
        {subtitle ? <div className="subtle">{subtitle}</div> : null}
      </div>
      <div className="pageHeaderRight">{right}</div>
    </div>
  )
}

export function Card({ children, className }) {
  return <div className={`card ${className || ''}`.trim()}>{children}</div>
}

export function CardTitle({ children }) {
  return <div className="cardTitle">{children}</div>
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <div className="fieldLabel">{label}</div>
      {children}
      {hint ? <div className="fieldHint">{hint}</div> : null}
    </label>
  )
}

export function Input(props) {
  return <input {...props} className={`input ${props.className || ''}`.trim()} />
}

export function Textarea(props) {
  return <textarea {...props} className={`textarea ${props.className || ''}`.trim()} />
}

export function Checkbox({ checked, onChange, label }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function Button({ variant = 'primary', ...props }) {
  const className = `btn ${variant === 'primary' ? '' : variant === 'ghost' ? 'btnGhost' : variant === 'danger' ? 'btnDanger' : ''} ${props.className || ''}`.trim()
  return <button {...props} className={className} />
}

export function Pill({ children }) {
  return <span className="pill">{children}</span>
}

export function EmptyState({ title, subtitle }) {
  return (
    <div className="empty">
      <div className="emptyTitle">{title}</div>
      {subtitle ? <div className="emptySubtitle">{subtitle}</div> : null}
    </div>
  )
}

export function ErrorBanner({ error }) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message || 'Something went wrong.'
  return (
    <div className="errorBanner">
      <div className="errorTitle">Error</div>
      <div className="errorMsg">{message}</div>
    </div>
  )
}
