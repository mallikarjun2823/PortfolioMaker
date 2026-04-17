import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { Button, Card, CardTitle, EmptyState, ErrorBanner, Field, Input, PageHeader } from '../components/Ui.jsx'

function toStr(v) {
  if (v === null || v === undefined) return ''
  return String(v)
}

export default function PortfoliosPage() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [createTitle, setCreateTitle] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listPortfolios(token)
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
  }, [])

  async function onCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.createPortfolio(token, {
        title: createTitle,
        slug: createSlug,
        description: createDescription,
        theme: null,
        is_published: false
      })
      setCreateTitle('')
      setCreateSlug('')
      setCreateDescription('')
      alert('Portfolio created')
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditTitle(toStr(p.title))
    setEditSlug(toStr(p.slug))
    setEditDescription(toStr(p.description))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditSlug('')
    setEditDescription('')
  }

  async function onSave(id) {
    setSaving(true)
    setError(null)
    try {
      await api.updatePortfolio(token, id, {
        title: editTitle,
        slug: editSlug,
        description: editDescription
      })
      alert('Saved')
      cancelEdit()
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id) {
    const ok = confirm('Delete this portfolio? This will delete all its data.')
    if (!ok) return

    setError(null)
    try {
      await api.deletePortfolio(token, id)
      alert('Deleted')
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div>
      <PageHeader
        title="Portfolios"
        subtitle="Create and manage your portfolios. Pick one to edit its data and layout."
        right={<Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>}
      />

      <ErrorBanner error={error} />

      <Card>
        <CardTitle>Create Portfolio</CardTitle>
        <form onSubmit={onCreate}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <Field label="Title">
              <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="My Portfolio" />
            </Field>
            <Field label="Slug" hint="Optional; blank auto-generates">
              <Input value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} placeholder="my-portfolio" />
            </Field>
            <Field label="Description">
              <Input value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="Short summary" />
            </Field>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={creating || !createTitle.trim()}>
              {creating ? 'Creating…' : 'Create Portfolio'}
            </Button>
          </div>
        </form>
      </Card>

      <div style={{ height: 14 }} />

      {loading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No portfolios yet" subtitle="Create your first portfolio above." />
      ) : (
        <div className="grid">
          {items.map((p) => {
            const isEditing = editingId === p.id
            return (
              <Card key={p.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{p.title}</div>
                    <div className="subtle">/{p.slug}</div>
                  </div>
                  <div className="row">
                    <Button variant="ghost" onClick={() => navigate(`/app/portfolios/${p.id}`)}>Open</Button>
                    <Button variant="ghost" onClick={() => startEdit(p)} disabled={isEditing}>Edit</Button>
                    <Button variant="danger" onClick={() => onDelete(p.id)}>Delete</Button>
                  </div>
                </div>

                <div className="divider" />

                {!isEditing ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>{p.description || 'No description'}</div>
                ) : (
                  <div>
                    <Field label="Title">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </Field>
                    <Field label="Slug">
                      <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                    </Field>
                    <Field label="Description">
                      <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                    </Field>

                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                      <Button onClick={() => onSave(p.id)} disabled={saving || !editTitle.trim()}>
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="divider" />

                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Link className="smallLink" to={`/app/portfolios/${p.id}/projects`}>Manage Projects</Link>
                  <Link className="smallLink" to={`/app/portfolios/${p.id}/sections`}>Manage Sections</Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
