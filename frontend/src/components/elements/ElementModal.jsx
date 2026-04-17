import React, { useEffect, useState } from 'react'

import { Button, Checkbox, Field, Input } from '../Ui.jsx'

const SOURCE_OPTIONS = [
  { value: 'PROJECT', label: 'PROJECT' },
  { value: 'SKILL', label: 'SKILL' },
  { value: 'EXPERIENCE', label: 'EXPERIENCE' },
  { value: 'PORTFOLIO', label: 'PORTFOLIO' }
]

const FIELDS_BY_SOURCE = {
  PROJECT: [
    { value: 'title', label: 'title' },
    { value: 'description', label: 'description' },
    { value: 'github_url', label: 'github_url' },
    { value: 'image', label: 'image' }
  ],
  SKILL: [
    { value: 'name', label: 'name' },
    { value: 'level', label: 'level' }
  ],
  EXPERIENCE: [
    { value: 'company', label: 'company' },
    { value: 'role', label: 'role' },
    { value: 'timeline', label: 'timeline' }
  ],
  PORTFOLIO: [
    { value: 'title', label: 'title' },
    { value: 'description', label: 'description' }
  ]
}

const FILTER_OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'in', label: 'in (comma list)' }
]

function normalizeFilterRow(row) {
  const key = String(row?.key || '').trim()
  const operator = String(row?.operator || 'eq').trim().toLowerCase()
  const rawValue = row?.value

  if (!key) return null
  if (!FILTER_OPERATORS.some((o) => o.value === operator)) return null

  if (operator === 'in') {
    const items = String(rawValue ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return { key, operator, value: items }
  }

  return { key, operator, value: rawValue ?? '' }
}

function firstFieldForSource(source) {
  const opts = FIELDS_BY_SOURCE[String(source || '').toUpperCase()] || []
  return opts[0]?.value || ''
}

export default function ElementModal({ open, mode, initial, onClose, onSubmit }) {
  const isOpen = !!open
  const title = mode === 'edit' ? 'Edit Element' : 'Add Element'

  const [label, setLabel] = useState('')
  const [dataSource, setDataSource] = useState('PROJECT')
  const [field, setField] = useState('title')
  const [isVisible, setIsVisible] = useState(true)
  const [filters, setFilters] = useState([{ key: '', operator: 'eq', value: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return

    const src = String(initial?.data_source || 'PROJECT').toUpperCase()
    const nextField = String(initial?.field || '').trim() || firstFieldForSource(src)

    setLabel(String(initial?.label || ''))
    setDataSource(src)
    setField(nextField)
    setIsVisible(initial?.is_visible !== undefined ? !!initial?.is_visible : true)

    const initialFilters = Array.isArray(initial?.config?.filters) ? initial.config.filters : []
    if (initialFilters.length > 0) {
      setFilters(
        initialFilters
          .filter((f) => f && typeof f === 'object')
          .map((f) => ({
            key: String(f.key || ''),
            operator: String(f.operator || 'eq').toLowerCase(),
            value: Array.isArray(f.value) ? f.value.join(', ') : String(f.value ?? '')
          }))
      )
    } else {
      setFilters([{ key: '', operator: 'eq', value: '' }])
    }

    setSubmitting(false)
    setError(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const allowed = (FIELDS_BY_SOURCE[String(dataSource || '').toUpperCase()] || []).map((o) => o.value)
    if (!allowed.includes(field)) {
      setField(firstFieldForSource(dataSource))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource])

  if (!isOpen) return null

  const fields = FIELDS_BY_SOURCE[String(dataSource || '').toUpperCase()] || []

  const labelOk = !!String(label || '').trim()

  async function submit(e) {
    e.preventDefault()
    setError(null)

    if (!labelOk) {
      setError('Label is required.')
      return
    }

    const normalizedFilters = (Array.isArray(filters) ? filters : [])
      .map(normalizeFilterRow)
      .filter(Boolean)

    const config = normalizedFilters.length > 0 ? { filters: normalizedFilters } : {}

    setSubmitting(true)
    try {
      await onSubmit?.({
        label: String(label).trim(),
        data_source: String(dataSource).toUpperCase(),
        field: String(field),
        is_visible: !!isVisible,
        config
      })
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Could not save element.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pmModalOverlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="pmModalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pmModalTop">
          <div>
            <div className="pmModalTitle">{title}</div>
            <div className="pmModalSubtitle">Define how backend data maps into this block.</div>
          </div>
          <button type="button" className="iconBtn" onClick={onClose} title="Close">✕</button>
        </div>

        {error ? (
          <div className="pmInlineError">
            <div style={{ fontWeight: 800 }}>Error</div>
            <div>{String(error)}</div>
          </div>
        ) : null}

        <form onSubmit={submit}>
          <Field label="Label" hint="Required">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Project Name" />
          </Field>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Data Source">
              <select className="input" value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Field">
              <select className="input" value={field} onChange={(e) => setField(e.target.value)}>
                {fields.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 10 }}>
            <Checkbox checked={isVisible} onChange={setIsVisible} label="Visible" />
          </div>

          <Field label="Filter (WHERE)" hint="Optional. Add conditions to limit which records are used for this element.">
            <div style={{ display: 'grid', gap: 10 }}>
              {(Array.isArray(filters) ? filters : []).map((row, idx) => {
                const keyId = `pmFilterKey-${idx}`
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 140px minmax(0, 1fr) 44px',
                      gap: 10,
                      alignItems: 'end'
                    }}
                  >
                    <div>
                      <div className="fieldLabel">Key</div>
                      <Input
                        value={row?.key || ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setFilters((prev) => prev.map((r, i) => (i === idx ? { ...r, key: v } : r)))
                        }}
                        placeholder="e.g., title"
                        list={keyId}
                      />
                      <datalist id={keyId}>
                        {fields.map((opt) => (
                          <option key={opt.value} value={opt.value} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <div className="fieldLabel">Operator</div>
                      <select
                        className="input"
                        value={String(row?.operator || 'eq').toLowerCase()}
                        onChange={(e) => {
                          const v = e.target.value
                          setFilters((prev) => prev.map((r, i) => (i === idx ? { ...r, operator: v } : r)))
                        }}
                      >
                        {FILTER_OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="fieldLabel">Value</div>
                      <Input
                        value={row?.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setFilters((prev) => prev.map((r, i) => (i === idx ? { ...r, value: v } : r)))
                        }}
                        placeholder={String(row?.operator || '').toLowerCase() === 'in' ? 'a, b, c' : 'value'}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="iconBtn"
                        title="Remove filter"
                        onClick={() => setFilters((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={(filters || []).length <= 1}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}

              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setFilters((prev) => [...(Array.isArray(prev) ? prev : []), { key: '', operator: 'eq', value: '' }])}
                >
                  + Add condition
                </Button>
              </div>

              <div className="fieldHint">Operators supported: =, ≠, contains, &gt;/≥/&lt;/≤, in</div>
            </div>
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting || !labelOk}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
