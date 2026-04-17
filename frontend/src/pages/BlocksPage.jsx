import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { Button, Card, CardTitle, EmptyState, ErrorBanner, Field, Input, PageHeader, Pill, Textarea } from '../components/Ui.jsx'
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

function KeyValueTable({ rows, emptyText = 'No values.' }) {
  const r = Array.isArray(rows) ? rows : []
  if (r.length === 0) return <div className="subtle">{emptyText}</div>

  return (
    <div className="tableWrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>S.No</th>
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

export default function BlocksPage() {
  const { token } = useAuth()
  const { portfolioId, sectionId } = useParams()

  const [blocks, setBlocks] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // create
  const [creating, setCreating] = useState(false)
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
            <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/sections`}>Back to Sections</Link>
            <Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px minmax(0, 1fr)',
          gap: 14,
          alignItems: 'start'
        }}
      >
        <Card>
          <CardTitle>Blocks</CardTitle>
          <div className="subtle">Create and select a block to configure.</div>
          <div className="divider" />

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
              <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
            </div>
          </form>

          <div className="divider" />

          {loading ? (
            <div className="subtle">Loading…</div>
          ) : blocks.length === 0 ? (
            <EmptyState title="No blocks" subtitle="Create the first one above." />
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
                    <CardTitle>Config the block</CardTitle>
                    <div className="subtle">Edit basics and config JSON (modal UI can be added later).</div>
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

                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
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

                <Field label="Config (JSON object)">
                  <Textarea value={draft.configText} onChange={(e) => setDraft((x) => ({ ...x, configText: e.target.value }))} />
                  {!jsonState.ok ? <div className="fieldHint">{jsonState.message}</div> : null}
                </Field>

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
    </div>
  )
}
