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
  const [createThemeId, setCreateThemeId] = useState('')
  const [creating, setCreating] = useState(false)

  const [themes, setThemes] = useState([])
  const [themesLoading, setThemesLoading] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editThemeId, setEditThemeId] = useState('')
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
    ;(async () => {
      setThemesLoading(true)
      try {
        const res = await api.listThemes(token)
        setThemes(Array.isArray(res) ? res : [])
      } catch {
        setThemes([])
      } finally {
        setThemesLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const rawThemeId = String(createThemeId || '').trim()
      const themeValue = rawThemeId ? Number(rawThemeId) : null
      await api.createPortfolio(token, {
        title: createTitle,
        slug: createSlug,
        description: createDescription,
        theme: Number.isFinite(themeValue) ? themeValue : null,
        is_published: false
      })
      setCreateTitle('')
      setCreateSlug('')
      setCreateDescription('')
      setCreateThemeId('')
      alert('Portfolio created')
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  function renderThemeCard(theme, { selected, onSelect }) {
    const cfg = (theme && theme.config && typeof theme.config === 'object') ? theme.config : {}
    const primary = cfg.primary_color || '#111827'
    const secondary = cfg.secondary_color || '#ffffff'
    const text = cfg.text_color || '#ffffff'
    const fontFamily = cfg.font_family || undefined
    const alignment = (cfg.alignment || 'left')

    return (
      <button
        key={theme.id}
        type="button"
        className={`themePickCard ${selected ? 'themePickCardSelected' : ''}`.trim()}
        onClick={() => onSelect?.(String(theme.id))}
      >
        <div className="themePickPreview" style={{ background: primary, color: text, fontFamily, textAlign: alignment }}>
          <div className="themePickTitle">Aa Portfolio</div>
          <div className="themePickSub">Project • Skills • Experience</div>
          <div className="themePickMiniCard" style={{ background: secondary, color: text }}>
            <div className="themePickMiniRow" />
            <div className="themePickMiniRow themePickMiniRowShort" />
          </div>
        </div>

        <div className="themePickMeta">
          <div className="themePickName">{theme.name}</div>
          <div className="themePickSwatches">
            <span className="themePickSwatch" style={{ background: primary }} />
            <span className="themePickSwatch" style={{ background: secondary }} />
            <span className="themePickSwatch" style={{ background: text }} />
          </div>
        </div>
      </button>
    )
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditTitle(toStr(p.title))
    setEditSlug(toStr(p.slug))
    setEditDescription(toStr(p.description))
    setEditThemeId(toStr(p.theme))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditSlug('')
    setEditDescription('')
    setEditThemeId('')
  }

  async function onSave(id) {
    setSaving(true)
    setError(null)
    try {
      const rawThemeId = String(editThemeId || '').trim()
      const themeValue = rawThemeId ? Number(rawThemeId) : null
      await api.updatePortfolio(token, id, {
        title: editTitle,
        slug: editSlug,
        description: editDescription,
        theme: Number.isFinite(themeValue) ? themeValue : null
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

          <Field label="Theme" hint="Pick a theme visually (optional)">
            {themesLoading ? (
              <div className="subtle">Loading themes…</div>
            ) : (
              <div className="themePickGrid">
                <button
                  type="button"
                  className={`themePickCard ${!createThemeId ? 'themePickCardSelected' : ''}`.trim()}
                  onClick={() => setCreateThemeId('')}
                >
                  <div className="themePickPreview" style={{ background: 'var(--card)', color: 'var(--text)' }}>
                    <div className="themePickTitle">Default</div>
                    <div className="themePickSub">Use app defaults</div>
                    <div className="themePickMiniCard" style={{ background: 'rgba(17, 24, 39, 0.06)', color: 'var(--text)' }}>
                      <div className="themePickMiniRow" />
                      <div className="themePickMiniRow themePickMiniRowShort" />
                    </div>
                  </div>
                  <div className="themePickMeta">
                    <div className="themePickName">No theme</div>
                    <div className="themePickSwatches">
                      <span className="themePickSwatch" style={{ background: 'var(--bg)' }} />
                      <span className="themePickSwatch" style={{ background: 'var(--card)' }} />
                      <span className="themePickSwatch" style={{ background: 'var(--text)' }} />
                    </div>
                  </div>
                </button>

                {themes.map((t) => renderThemeCard(t, { selected: String(t.id) === String(createThemeId), onSelect: setCreateThemeId }))}
              </div>
            )}
          </Field>

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

                    <Field label="Theme" hint="Pick a theme visually (optional)">
                      {themesLoading ? (
                        <div className="subtle">Loading themes…</div>
                      ) : (
                        <div className="themePickGrid">
                          <button
                            type="button"
                            className={`themePickCard ${!editThemeId ? 'themePickCardSelected' : ''}`.trim()}
                            onClick={() => setEditThemeId('')}
                          >
                            <div className="themePickPreview" style={{ background: 'var(--card)', color: 'var(--text)' }}>
                              <div className="themePickTitle">Default</div>
                              <div className="themePickSub">Use app defaults</div>
                              <div className="themePickMiniCard" style={{ background: 'rgba(17, 24, 39, 0.06)', color: 'var(--text)' }}>
                                <div className="themePickMiniRow" />
                                <div className="themePickMiniRow themePickMiniRowShort" />
                              </div>
                            </div>
                            <div className="themePickMeta">
                              <div className="themePickName">No theme</div>
                              <div className="themePickSwatches">
                                <span className="themePickSwatch" style={{ background: 'var(--bg)' }} />
                                <span className="themePickSwatch" style={{ background: 'var(--card)' }} />
                                <span className="themePickSwatch" style={{ background: 'var(--text)' }} />
                              </div>
                            </div>
                          </button>

                          {themes.map((t) => renderThemeCard(t, { selected: String(t.id) === String(editThemeId), onSelect: setEditThemeId }))}
                        </div>
                      )}
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
                  <Link className="smallLink" to={`/app/portfolios/${p.id}/build`}>Build</Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
