import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { Button, Card, CardTitle, EmptyState, ErrorBanner, Field, Input, Modal, PageHeader, Pill, Textarea } from '../components/Ui.jsx'
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
            <th>Config name</th>
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

export default function SectionsPage() {
  const { token } = useAuth()
  const { portfolioId } = useParams()

  const [sections, setSections] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // create
  const [creating, setCreating] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createOrder, setCreateOrder] = useState('')

  // edit selected
  const [draft, setDraft] = useState({ name: '', order: '', is_visible: true, configText: '{}' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [togglingVisible, setTogglingVisible] = useState(false)

  const selected = useMemo(() => sections.find((s) => s.id === selectedId) || null, [sections, selectedId])

  const jsonState = useMemo(() => {
    try {
      return { ok: true, value: safeJsonParseObject(draft.configText), message: null }
    } catch (e) {
      return { ok: false, value: null, message: e?.message || 'Invalid JSON.' }
    }
  }, [draft.configText])

  const configRows = useMemo(() => {
    if (!jsonState.ok) return []
    const cfg = jsonState.value || {}
    const { lookup, ...rest } = cfg
    return toKeyValueRows(rest)
  }, [jsonState])

  const lookupRows = useMemo(() => {
    if (!jsonState.ok) return []
    const cfg = jsonState.value || {}
    const lookup = cfg.lookup
    if (!lookup || typeof lookup !== 'object' || Array.isArray(lookup)) return []
    return toKeyValueRows(lookup)
  }, [jsonState])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listSections(token, portfolioId)
      const list = Array.isArray(res) ? res : []
      setSections(list)

      if (list.length === 0) {
        setSelectedId(null)
      } else if (!list.some((s) => s.id === selectedId)) {
        setSelectedId(list[0].id)
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId])

  useEffect(() => {
    if (!selected) return
    setDraft({
      name: selected.name || '',
      order: selected.order ?? '',
      is_visible: !!selected.is_visible,
      configText: JSON.stringify(selected.config || {}, null, 2)
    })
  }, [selectedId])

  async function onCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const payload = { name: createName }
      if (createOrder !== '') payload.order = Number(createOrder)
      const created = await api.createSection(token, portfolioId, payload)
      setCreateName('')
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
        name: draft.name,
        is_visible: !!draft.is_visible,
        config: safeJsonParseObject(draft.configText)
      }
      if (draft.order !== '') payload.order = Number(draft.order)

      await api.updateSection(token, portfolioId, selected.id, payload)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!selected) return
    const ok = confirm('Delete this section?')
    if (!ok) return

    setDeleting(true)
    setError(null)
    try {
      await api.deleteSection(token, portfolioId, selected.id)
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
    if (nextOrder < 1 || nextOrder > sections.length) return

    setMoving(true)
    setError(null)
    try {
      await api.updateSection(token, portfolioId, selected.id, { order: nextOrder })
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
      await api.updateSection(token, portfolioId, selected.id, { is_visible: !selected.is_visible })
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
        title="Sections"
        subtitle="Pick a section on the left, configure it on the right."
        right={
          <div className="row">
            <Button onClick={() => setCreateModalOpen(true)}>+ Add New Section</Button>
            <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/build`}>Back</Link>
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
          <CardTitle>Sections</CardTitle>
          <div className="subtle">Select a section to configure.</div>

          <div className="divider" />

          {loading ? (
            <div className="subtle">Loading…</div>
          ) : sections.length === 0 ? (
            <EmptyState title="No sections" subtitle="Click + Add New Section." />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {sections.map((s) => {
                const active = s.id === selectedId
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
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
                        #{s.order} • {s.name}
                      </div>
                      <div className="subtle" style={{ marginTop: 4 }}>{s.is_visible ? 'Visible' : 'Hidden'}</div>
                    </div>
                    {!s.is_visible ? <Pill>Hidden</Pill> : null}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <div style={{ display: 'grid', gap: 14 }}>
          {!selected ? (
            <Card>
              <CardTitle>Configure section</CardTitle>
              <EmptyState title="Select a section" subtitle="Choose a section from the left rail." />
            </Card>
          ) : (
            <>
              <Card>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <CardTitle>Config the section</CardTitle>
                    <div className="subtle">Edit basics and config JSON (modal UI can be added later).</div>
                  </div>
                  <div className="row">
                    <Button variant="ghost" onClick={() => move(-1)} disabled={moving || selected.order <= 1}>↑</Button>
                    <Button variant="ghost" onClick={() => move(+1)} disabled={moving || selected.order >= sections.length}>↓</Button>
                    <Button variant="ghost" onClick={toggleVisible} disabled={togglingVisible}>
                      {selected.is_visible ? 'Hide' : 'Show'}
                    </Button>
                    <Button variant="danger" onClick={onDelete} disabled={deleting}>Delete</Button>
                  </div>
                </div>

                <div className="divider" />

                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  <Field label="Name">
                    <Input value={draft.name} onChange={(e) => setDraft((x) => ({ ...x, name: e.target.value }))} />
                  </Field>
                  <Field label={`Order (1..${Math.max(1, sections.length)})`}>
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

                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/sections/${selected.id}/blocks`}>
                    Add blocks
                  </Link>
                  <Button onClick={onSave} disabled={saving || !draft.name.trim() || !jsonState.ok}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </Card>

              <Card>
                <CardTitle>Config values</CardTitle>
                <KeyValueTable rows={configRows} emptyText="No config values." />
              </Card>

              <Card>
                <CardTitle>Lookup CSS values</CardTitle>
                <div className="subtle">If you add a top-level `lookup` object in config, it shows up here.</div>
                <div className="divider" />
                <KeyValueTable rows={lookupRows} emptyText="No lookup values." />
              </Card>
            </>
          )}
        </div>
      </div>

      <Modal
        open={createModalOpen}
        title="Create Section"
        subtitle="Create form opens only when you click + Add New Section."
        onClose={() => setCreateModalOpen(false)}
      >
        <form onSubmit={onCreate}>
          <Field label="New section name">
            <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="sec1" />
          </Field>
          <Field label="Order" hint={`Optional (1..${sections.length + 1})`}>
            <Input value={createOrder} onChange={(e) => setCreateOrder(e.target.value)} placeholder="1" />
          </Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" disabled={creating || !createName.trim()}>{creating ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
