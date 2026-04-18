import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

const KIND_META = {
  success: { title: 'Success' },
  error: { title: 'Error' },
  info: { title: 'Note' }
}

const DEFAULT_DURATION_MS = {
  success: 3200,
  error: 5200,
  info: 3600
}

export function toErrorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error.message === 'string' && error.message.trim()) return error.message
  return fallback
}

function ToastViewport({ toasts, onClose }) {
  return (
    <div className="toastViewport" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast${toast.kind.charAt(0).toUpperCase()}${toast.kind.slice(1)}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
        >
          <div className="toastMain">
            <div className="toastTitle">{toast.title}</div>
            <div className="toastMessage">{toast.message}</div>
          </div>
          <button type="button" className="iconBtn toastClose" aria-label="Dismiss notification" onClick={() => onClose(toast.id)}>
            x
          </button>
        </div>
      ))}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(1)
  const timersRef = useRef(new Map())

  const remove = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((kind, message, options = {}) => {
    const normalizedKind = kind === 'success' || kind === 'error' || kind === 'info' ? kind : 'info'
    const id = counterRef.current
    counterRef.current += 1

    const toast = {
      id,
      kind: normalizedKind,
      title: options.title || KIND_META[normalizedKind].title,
      message: message || 'Done'
    }

    setToasts((prev) => {
      const next = [...prev, toast]
      return next.length > 5 ? next.slice(next.length - 5) : next
    })

    const duration = typeof options.duration === 'number' ? options.duration : DEFAULT_DURATION_MS[normalizedKind]
    if (duration > 0) {
      const timer = setTimeout(() => {
        remove(id)
      }, duration)
      timersRef.current.set(id, timer)
    }

    return id
  }, [remove])

  const api = useMemo(() => ({
    show: push,
    success: (message, options) => push('success', message, options),
    error: (message, options) => push('error', message, options),
    info: (message, options) => push('info', message, options),
    dismiss: remove
  }), [push, remove])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return value
}