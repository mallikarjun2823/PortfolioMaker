import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { Button, Card, CardTitle, EmptyState, ErrorBanner, Field, Input, Modal, PageHeader, Pill, Textarea } from '../components/Ui.jsx'
import ElementList from '../components/elements/ElementList.jsx'
import ElementModal from '../components/elements/ElementModal.jsx'
import Value from '../components/render/Value.jsx'

function safeJsonParseObject(text) {
  if (!text || !String(text).trim()) return {}
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Config must be a JSON object.')
  }
  return parsed
}

function toKeyValueRows(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.entries(obj).map(([k, v], idx) => ({ sno: idx + 1, name: k, value: v }))
}

function normalizeHexColor(value, fallback) {
  const v = String(value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  return fallback
}

function KeyValueTable({ rows, emptyText = 'No values.' }) {
  const r = Array.isArray(rows) ? rows : []
  if (r.length === 0) return <div className="subtle">{emptyText}</div>

  return (
    <div className="tableWrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>#</th>
            <th>Name</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {r.map((row) => (
            <tr key={row.sno}>
              <td>{row.sno}</td>
              <td>{row.name}</td>
              <td>
                <Value value={row.value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const BLOCK_TYPES = [
  { value: 'LIST', label: 'List' },
  { value: 'GRID', label: 'Grid' },
  { value: 'TIMELINE', label: 'Timeline' },
  { value: 'KEY_VALUE', label: 'Key / Value' },
  { value: 'IMAGE', label: 'Image' }
]

const BLOCK_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' }
]

const BLOCK_FONT_STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Italic' }
]

const BLOCK_FONT_WEIGHT_OPTIONS = [
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi Bold (600)' },
  { value: '700', label: 'Bold (700)' }
]

const BLOCK_FONT_FAMILY_OPTIONS = [
  { value: '', label: 'Theme default' },
  { value: '"Segoe UI", Tahoma, sans-serif', label: 'Modern Sans' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Classic Serif' },
  { value: '"Trebuchet MS", "Segoe UI", sans-serif', label: 'Friendly Sans' },
  { value: '"Consolas", "Courier New", monospace', label: 'Monospace' }
]

const BLOCK_PADDING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' }
]

export default function BlocksPage() {
  const { token } = useAuth()
  const { portfolioId, sectionId } = useParams()

  const [blocks, setBlocks] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // create
  const [creating, setCreating] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createType, setCreateType] = useState('LIST')
  const [createOrder, setCreateOrder] = useState('')

  // edit selected
  const [draft, setDraft] = useState({ type: 'LIST', order: '', is_visible: true, configText: '{}' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [togglingVisible, setTogglingVisible] = useState(false)

  // elements
  const [elements, setElements] = useState([])
  const [elementsLoading, setElementsLoading] = useState(false)
  const [elementsError, setElementsError] = useState(null)
  const [elementModalOpen, setElementModalOpen] = useState(false)
  const [elementModalMode, setElementModalMode] = useState('add')
  const [elementEditing, setElementEditing] = useState(null)

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) || null, [blocks, selectedId])

  const jsonState = useMemo(() => {
    try {
      return { ok: true, value: safeJsonParseObject(draft.configText), message: null }
    } catch (e) {
      return { ok: false, value: null, message: e?.message || 'Invalid JSON.' }
    }
  }, [draft.configText])

  const configRows = useMemo(() => (jsonState.ok ? toKeyValueRows(jsonState.value || {}) : []), [jsonState])

  const blockLabel = useMemo(() => {
    if (!jsonState.ok) return ''
    const cfg = jsonState.value || {}
    const value = cfg.title ?? cfg.label ?? cfg.heading
    return typeof value === 'string' ? value : ''
  }, [jsonState])

  const showBlockLabel = useMemo(() => {
    if (!jsonState.ok) return true
    const cfg = jsonState.value || {}
    return cfg.show_title !== false
  }, [jsonState])

  const blockStyle = useMemo(() => {
    if (!jsonState.ok) {
      return {
        text_align: 'left',
        font_style: 'normal',
        font_weight: '400',
        font_family: '',
        padding: 'none',
        text_color: '#e2e8f0',
        heading_color: '#e2e8f0',
        surface_color: '#1f2937',
        border_color: '#334155'
      }
    }

    const cfg = jsonState.value || {}
    const style = cfg.style && typeof cfg.style === 'object' ? cfg.style : {}
    return {
      text_align: String(style.text_align || 'left'),
      font_style: String(style.font_style || 'normal'),
      font_weight: String(style.font_weight || '400'),
      font_family: String(style.font_family || ''),
      padding: String(style.padding || 'none'),
      text_color: normalizeHexColor(style.text_color, '#e2e8f0'),
      heading_color: normalizeHexColor(style.heading_color, '#e2e8f0'),
      surface_color: normalizeHexColor(style.surface_color, '#1f2937'),
      border_color: normalizeHexColor(style.border_color, '#334155')
    }
  }, [jsonState])

  function updateDraftConfig(mutator) {
    setDraft((prev) => {
      let config = {}
      try {
        config = safeJsonParseObject(prev.configText)
      } catch {
        config = {}
      }

      const next = mutator({ ...config })
      return {
        ...prev,
        configText: JSON.stringify(next || {}, null, 2)
      }
    })
  }

  function setStyleField(field, value, { removeIfEmpty = false } = {}) {
    updateDraftConfig((cfg) => {
      const style = cfg.style && typeof cfg.style === 'object' ? { ...cfg.style } : {}
      const nextValue = String(value ?? '').trim()

      if ((removeIfEmpty && !nextValue) || nextValue === '__REMOVE__') {
        delete style[field]
      } else {
        style[field] = value
      }

      if (Object.keys(style).length === 0) delete cfg.style
      else cfg.style = style

      return cfg
    })
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listBlocks(token, portfolioId, sectionId)
      const list = Array.isArray(res) ? res : []
      setBlocks(list)

      if (list.length === 0) {
        setSelectedId(null)
      } else if (!list.some((b) => b.id === selectedId)) {
        setSelectedId(list[0].id)
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, portfolioId, sectionId])

  useEffect(() => {
    if (!selected) return
    setDraft({
      type: selected.type || 'LIST',
      order: selected.order ?? '',
      is_visible: !!selected.is_visible,
      configText: JSON.stringify(selected.config || {}, null, 2)
    })
  }, [selectedId])

  async function loadElements(blockId) {
    if (!blockId) {
      setElements([])
      return
    }

    setElementsLoading(true)
    setElementsError(null)
    try {
      const res = await api.listElements(token, portfolioId, sectionId, blockId)
      setElements(Array.isArray(res) ? res : [])
    } catch (err) {
      setElementsError(err)
      setElements([])
    } finally {
      setElementsLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    if (!selected?.id) {
      setElements([])
      setElementsError(null)
      return
    }
    loadElements(selected.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, portfolioId, sectionId, selectedId])

  function openAddElement() {
    setElementModalMode('add')
    setElementEditing(null)
    setElementModalOpen(true)
  }

  function openEditElement(el) {
    setElementModalMode('edit')
    setElementEditing(el)
    setElementModalOpen(true)
  }

  async function submitElement(payload) {
    if (!selected?.id) return
    setElementsError(null)

    if (String(selected?.type || '').toUpperCase() === 'GRID') {
      const editingId = elementModalMode === 'edit' ? Number(elementEditing?.id) : null
      const existingSources = new Set(
        (Array.isArray(elements) ? elements : [])
          .filter((el) => (editingId ? Number(el?.id) !== editingId : true))
          .map((el) => String(el?.data_source || '').toUpperCase())
          .filter(Boolean)
      )

      if (existingSources.size > 1) {
        throw new Error('This GRID block already has mixed data sources. Fix existing elements first.')
      }

      if (existingSources.size === 1) {
        const required = Array.from(existingSources)[0]
        const incoming = String(payload?.data_source || '').toUpperCase()
        if (incoming && incoming !== required) {
          throw new Error(`GRID block elements must all use ${required} as data source.`)
        }
      }
    }

    if (elementModalMode === 'edit' && elementEditing?.id) {
      await api.updateElement(token, portfolioId, sectionId, selected.id, elementEditing.id, payload)
      await loadElements(selected.id)
      return
    }
    await api.createElement(token, portfolioId, sectionId, selected.id, payload)
    await loadElements(selected.id)
  }

  async function deleteElement(el) {
    if (!selected?.id || !el?.id) return
    const ok = confirm('Delete this element?')
    if (!ok) return
    setElementsError(null)
    try {
      await api.deleteElement(token, portfolioId, sectionId, selected.id, el.id)
      await loadElements(selected.id)
    } catch (err) {
      setElementsError(err)
    }
  }

  async function toggleElementVisible(el) {
    if (!selected?.id || !el?.id) return
    setElementsError(null)
    try {
      await api.updateElement(token, portfolioId, sectionId, selected.id, el.id, { is_visible: !el.is_visible })
      await loadElements(selected.id)
    } catch (err) {
      setElementsError(err)
    }
  }

  async function moveElement(el, direction) {
    if (!selected?.id || !el?.id) return
    const nextOrder = Number(el.order) + Number(direction)
    if (!Number.isFinite(nextOrder)) return

    setElementsError(null)
    try {
      await api.updateElement(token, portfolioId, sectionId, selected.id, el.id, { order: nextOrder })
      await loadElements(selected.id)
    } catch (err) {
      setElementsError(err)
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const payload = { type: createType }
      if (createOrder !== '') payload.order = Number(createOrder)
      const created = await api.createBlock(token, portfolioId, sectionId, payload)
      setCreateOrder('')
      setCreateModalOpen(false)
      await load()
      if (created?.id) setSelectedId(created.id)
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onSave() {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        type: draft.type,
        is_visible: !!draft.is_visible,
        config: safeJsonParseObject(draft.configText)
      }
      if (draft.order !== '') payload.order = Number(draft.order)

      await api.updateBlock(token, portfolioId, sectionId, selected.id, payload)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!selected) return
    const ok = confirm('Delete this block?')
    if (!ok) return

    setDeleting(true)
    setError(null)
    try {
      await api.deleteBlock(token, portfolioId, sectionId, selected.id)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setDeleting(false)
    }
  }

  async function move(direction) {
    if (!selected) return
    const nextOrder = Number(selected.order) + direction
    if (nextOrder < 1 || nextOrder > blocks.length) return

    setMoving(true)
    setError(null)
    try {
      await api.updateBlock(token, portfolioId, sectionId, selected.id, { order: nextOrder })
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setMoving(false)
    }
  }

  async function toggleVisible() {
    if (!selected) return
    setTogglingVisible(true)
    setError(null)
    try {
      await api.updateBlock(token, portfolioId, sectionId, selected.id, { is_visible: !selected.is_visible })
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setTogglingVisible(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Blocks"
        subtitle="Pick a block on the left, configure it on the right."
        right={
          <div className="row">
            <Button onClick={() => setCreateModalOpen(true)}>+ Add New Block</Button>
            <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/sections`}>Back to Sections</Link>
            <Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      <div className="splitPanel">
        <Card>
          <CardTitle>Blocks</CardTitle>
          <div className="subtle">Select a block to configure.</div>

          <div className="divider" />

          {loading ? (
            <div className="subtle">Loading…</div>
          ) : blocks.length === 0 ? (
            <EmptyState title="No blocks" subtitle="Click + Add New Block." />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {blocks.map((b) => {
                const active = b.id === selectedId
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className="btn btnGhost"
                    style={{
                      textAlign: 'left',
                      justifyContent: 'space-between',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 14,
                      border: active ? '1px solid rgba(79, 70, 229, 0.28)' : undefined
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        #{b.order} • {b.type}
                      </div>
                      <div className="subtle" style={{ marginTop: 4 }}>{b.is_visible ? 'Visible' : 'Hidden'}</div>
                    </div>
                    {!b.is_visible ? <Pill>Hidden</Pill> : null}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <div style={{ display: 'grid', gap: 14 }}>
          {!selected ? (
            <Card>
              <CardTitle>Configure block</CardTitle>
              <EmptyState title="Select a block" subtitle="Choose a block from the left rail." />
            </Card>
          ) : (
            <>
              <Card>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <CardTitle>Configure Block</CardTitle>
                    <div className="subtle">Use visual controls first. Advanced JSON is optional.</div>
                  </div>
                  <div className="row">
                    <Button variant="ghost" onClick={() => move(-1)} disabled={moving || selected.order <= 1}>↑</Button>
                    <Button variant="ghost" onClick={() => move(+1)} disabled={moving || selected.order >= blocks.length}>↓</Button>
                    <Button variant="ghost" onClick={toggleVisible} disabled={togglingVisible}>
                      {selected.is_visible ? 'Hide' : 'Show'}
                    </Button>
                    <Button variant="danger" onClick={onDelete} disabled={deleting}>Delete</Button>
                  </div>
                </div>

                <div className="divider" />

                <div className="layoutGrid3">
                  <Field label="Type">
                    <select
                      className="input"
                      value={draft.type}
                      onChange={(e) => setDraft((x) => ({ ...x, type: e.target.value }))}
                    >
                      {BLOCK_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`Order (1..${Math.max(1, blocks.length)})`}>
                    <Input value={draft.order} onChange={(e) => setDraft((x) => ({ ...x, order: e.target.value }))} />
                  </Field>
                  <Field label="Visibility">
                    <label className="checkbox" style={{ marginTop: 8 }}>
                      <input type="checkbox" checked={!!draft.is_visible} onChange={(e) => setDraft((x) => ({ ...x, is_visible: e.target.checked }))} />
                      <span>Visible</span>
                    </label>
                  </Field>
                </div>

                <div className="layoutMainAside">
                  <Field label="Block label" hint="Used as the section title for this block.">
                    <Input
                      value={blockLabel}
                      onChange={(e) => {
                        const nextTitle = String(e.target.value || '')
                        updateDraftConfig((cfg) => {
                          if (nextTitle.trim()) cfg.title = nextTitle
                          else delete cfg.title
                          delete cfg.label
                          delete cfg.heading
                          return cfg
                        })
                      }}
                      placeholder="e.g., Skills"
                      disabled={!jsonState.ok}
                    />
                  </Field>

                  <Field label="Title visibility">
                    <label className="checkbox" style={{ marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={showBlockLabel}
                        onChange={(e) => {
                          const checked = e.target.checked
                          updateDraftConfig((cfg) => {
                            cfg.show_title = checked
                            return cfg
                          })
                        }}
                        disabled={!jsonState.ok}
                      />
                      <span>Show block label</span>
                    </label>
                  </Field>
                </div>

                <div className="divider" />

                <div style={{ marginBottom: 8, fontWeight: 800 }}>Style Controls (No code)</div>

                <div className="layoutGrid3">
                  <Field label="Text align">
                    <select
                      className="input"
                      value={blockStyle.text_align}
                      onChange={(e) => setStyleField('text_align', e.target.value)}
                      disabled={!jsonState.ok}
                    >
                      {BLOCK_ALIGN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Font style">
                    <select
                      className="input"
                      value={blockStyle.font_style}
                      onChange={(e) => setStyleField('font_style', e.target.value)}
                      disabled={!jsonState.ok}
                    >
                      {BLOCK_FONT_STYLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Font weight">
                    <select
                      className="input"
                      value={blockStyle.font_weight}
                      onChange={(e) => setStyleField('font_weight', e.target.value)}
                      disabled={!jsonState.ok}
                    >
                      {BLOCK_FONT_WEIGHT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="layoutGrid2">
                  <Field label="Font family">
                    <select
                      className="input"
                      value={blockStyle.font_family}
                      onChange={(e) => setStyleField('font_family', e.target.value, { removeIfEmpty: true })}
                      disabled={!jsonState.ok}
                    >
                      {BLOCK_FONT_FAMILY_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Inner spacing">
                    <select
                      className="input"
                      value={blockStyle.padding}
                      onChange={(e) => setStyleField('padding', e.target.value)}
                      disabled={!jsonState.ok}
                    >
                      {BLOCK_PADDING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="layoutGrid4">
                  <Field label="Text color">
                    <Input
                      type="color"
                      value={blockStyle.text_color}
                      onChange={(e) => setStyleField('text_color', e.target.value)}
                      disabled={!jsonState.ok}
                    />
                  </Field>

                  <Field label="Heading color">
                    <Input
                      type="color"
                      value={blockStyle.heading_color}
                      onChange={(e) => setStyleField('heading_color', e.target.value)}
                      disabled={!jsonState.ok}
                    />
                  </Field>

                  <Field label="Surface color">
                    <Input
                      type="color"
                      value={blockStyle.surface_color}
                      onChange={(e) => setStyleField('surface_color', e.target.value)}
                      disabled={!jsonState.ok}
                    />
                  </Field>

                  <Field label="Border color">
                    <Input
                      type="color"
                      value={blockStyle.border_color}
                      onChange={(e) => setStyleField('border_color', e.target.value)}
                      disabled={!jsonState.ok}
                    />
                  </Field>
                </div>

                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="subtle">Applied instantly to this block style.</div>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => updateDraftConfig((cfg) => {
                      delete cfg.style
                      return cfg
                    })}
                    disabled={!jsonState.ok}
                  >
                    Reset style
                  </Button>
                </div>

                <details style={{ marginTop: 10 }}>
                  <summary className="subtle" style={{ cursor: 'pointer' }}>Advanced JSON config (optional)</summary>
                  <div style={{ marginTop: 10 }}>
                    <Field label="Config (JSON object)">
                      <Textarea value={draft.configText} onChange={(e) => setDraft((x) => ({ ...x, configText: e.target.value }))} />
                      {!jsonState.ok ? <div className="fieldHint">{jsonState.message}</div> : null}
                    </Field>
                  </div>
                </details>

                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button onClick={onSave} disabled={saving || !jsonState.ok}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>

                <div className="divider" />

                <ErrorBanner error={elementsError} />

                <ElementList
                  elements={elements}
                  loading={elementsLoading}
                  onAdd={openAddElement}
                  onToggleVisible={toggleElementVisible}
                  onEdit={openEditElement}
                  onDelete={deleteElement}
                  onMove={moveElement}
                />
              </Card>

              <Card>
                <CardTitle>Config values</CardTitle>
                <KeyValueTable rows={configRows} emptyText="No config values." />
              </Card>
            </>
          )}
        </div>
      </div>

      <ElementModal
        open={elementModalOpen}
        mode={elementModalMode}
        initial={elementEditing}
        onClose={() => setElementModalOpen(false)}
        onSubmit={submitElement}
      />

      <Modal
        open={createModalOpen}
        title="Create Block"
        onClose={() => setCreateModalOpen(false)}
      >
        <form onSubmit={onCreate}>
          <Field label="Type">
            <select
              className="input"
              value={createType}
              onChange={(e) => setCreateType(e.target.value)}
            >
              {BLOCK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Order" hint={`Optional (1..${blocks.length + 1})`}>
            <Input value={createOrder} onChange={(e) => setCreateOrder(e.target.value)} placeholder="1" />
          </Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
