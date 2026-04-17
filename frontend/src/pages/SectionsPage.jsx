import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { Button, Card, CardTitle, EmptyState, ErrorBanner, Field, Input, PageHeader, Textarea } from '../components/Ui.jsx'

function safeJsonParse(text) {
  if (!text || !String(text).trim()) return {}
  return JSON.parse(text)
}

export default function SectionsPage() {
  const { token } = useAuth()
  const { portfolioId } = useParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // create
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [order, setOrder] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [configText, setConfigText] = useState('{}')

  // edit
  const [editingId, setEditingId] = useState(null)
  const [edit, setEdit] = useState({ name: '', order: '', is_visible: true, configText: '{}' })
  const [savingId, setSavingId] = useState(null)

  const maxOrder = useMemo(() => items.length || 1, [items.length])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listSections(token, portfolioId)
      setItems(Array.isArray(res) ? res : [])
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

  async function onCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)

    try {
      const payload = {
        name,
        is_visible: !!isVisible
      }

      if (order !== '') payload.order = Number(order)

      // Config is optional; if provided, it must be an object.
      if (configText && configText.trim()) payload.config = safeJsonParse(configText)

      await api.createSection(token, portfolioId, payload)
      alert('Section created')
      setName('')
      setOrder('')
      setIsVisible(true)
      setConfigText('{}')
      await load()
    } catch (err) {
      if (err?.name === 'SyntaxError') {
        setError(new Error('Config must be valid JSON object.'))
      } else {
        setError(err)
      }
    } finally {
      setCreating(false)
    }
  }

  function startEdit(s) {
    setEditingId(s.id)
    setEdit({
      name: s.name || '',
      order: s.order ?? '',
      is_visible: !!s.is_visible,
      configText: JSON.stringify(s.config || {}, null, 2)
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEdit({ name: '', order: '', is_visible: true, configText: '{}' })
  }

  async function onSave(s) {
    setSavingId(s.id)
    setError(null)
    try {
      const payload = {
        name: edit.name,
        is_visible: !!edit.is_visible
      }
      if (edit.order !== '') payload.order = Number(edit.order)
      payload.config = safeJsonParse(edit.configText)

      await api.updateSection(token, portfolioId, s.id, payload)
      alert('Saved')
      cancelEdit()
      await load()
    } catch (err) {
      if (err?.name === 'SyntaxError') {
        setError(new Error('Config must be valid JSON object.'))
      } else {
        setError(err)
      }
    } finally {
      setSavingId(null)
    }
  }

  async function onDelete(s) {
    const ok = confirm('Delete this section?')
    if (!ok) return

    setError(null)
    try {
      await api.deleteSection(token, portfolioId, s.id)
      alert('Deleted')
      await load()
    } catch (err) {
      setError(err)
    }
  }

  async function move(s, direction) {
    // direction: -1 (up), +1 (down)
    const nextOrder = Number(s.order) + direction
    if (nextOrder < 1 || nextOrder > items.length) return

    setError(null)
    try {
      await api.updateSection(token, portfolioId, s.id, { order: nextOrder })
      await load()
    } catch (err) {
      setError(err)
    }
  }

  async function toggleVisible(s) {
    setError(null)
    try {
      await api.updateSection(token, portfolioId, s.id, { is_visible: !s.is_visible })
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div>
      <PageHeader
        title="Sections"
        subtitle="Sections are structural and ordered. Use ↑ ↓ to reorder and toggle visibility."
        right={<Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>}
      />

      <ErrorBanner error={error} />

      <Card>
        <CardTitle>Create Section</CardTitle>
        <form onSubmit={onCreate}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="About" />
            </Field>
            <Field label="Order" hint={`Optional (1..${items.length + 1})`}>
              <Input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="1" />
            </Field>
            <Field label="Visibility">
              <label className="checkbox" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
                <span>Visible</span>
              </label>
            </Field>
          </div>

          <Field label="Config (JSON object)" hint='Optional. Example: {"text_size": "lg"}'>
            <Textarea value={configText} onChange={(e) => setConfigText(e.target.value)} />
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>

      <div style={{ height: 14 }} />

      {loading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No sections yet" subtitle="Create your first section above." />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {items.map((s) => {
            const isEditing = editingId === s.id
            return (
              <Card key={s.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      #{s.order} • {s.name}
                    </div>
                    <div className="subtle">{s.is_visible ? 'Visible' : 'Hidden'}</div>
                  </div>

                  <div className="row">
                    <Button variant="ghost" onClick={() => move(s, -1)} disabled={s.order <= 1}>↑</Button>
                    <Button variant="ghost" onClick={() => move(s, +1)} disabled={s.order >= items.length}>↓</Button>
                    <Button variant="ghost" onClick={() => toggleVisible(s)}>
                      {s.is_visible ? 'Hide' : 'Show'}
                    </Button>
                    <Button variant="ghost" onClick={() => startEdit(s)} disabled={isEditing}>Edit</Button>
                    <Button variant="danger" onClick={() => onDelete(s)}>Delete</Button>
                  </div>
                </div>

                <div className="divider" />

                {!isEditing ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                    <div><strong>Config:</strong></div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(s.config || {}, null, 2)}</pre>
                  </div>
                ) : (
                  <div>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                      <Field label="Name">
                        <Input value={edit.name} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} />
                      </Field>
                      <Field label={`Order (1..${maxOrder})`}>
                        <Input value={edit.order} onChange={(e) => setEdit((x) => ({ ...x, order: e.target.value }))} />
                      </Field>
                      <Field label="Visibility">
                        <label className="checkbox" style={{ marginTop: 8 }}>
                          <input type="checkbox" checked={edit.is_visible} onChange={(e) => setEdit((x) => ({ ...x, is_visible: e.target.checked }))} />
                          <span>Visible</span>
                        </label>
                      </Field>
                    </div>

                    <Field label="Config (JSON object)">
                      <Textarea value={edit.configText} onChange={(e) => setEdit((x) => ({ ...x, configText: e.target.value }))} />
                    </Field>

                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={cancelEdit} disabled={savingId === s.id}>Cancel</Button>
                      <Button onClick={() => onSave(s)} disabled={savingId === s.id || !edit.name.trim()}>
                        {savingId === s.id ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
