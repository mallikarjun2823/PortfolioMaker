import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { api, resolveAssetUrl } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { toErrorMessage, useToast } from '../services/toast.jsx'
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, PageHeader } from '../components/Ui.jsx'

function toStr(v) {
  if (v === null || v === undefined) return ''
  return String(v)
}

export default function PortfoliosPage() {
  const { token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [createTitle, setCreateTitle] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createThemeId, setCreateThemeId] = useState('')
  const [createResumeFile, setCreateResumeFile] = useState(null)
  const [creating, setCreating] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [themes, setThemes] = useState([])
  const [themesLoading, setThemesLoading] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editThemeId, setEditThemeId] = useState('')
  const [editResumeFile, setEditResumeFile] = useState(null)
  const [editResumeUrl, setEditResumeUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishBusyId, setPublishBusyId] = useState(null)

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
        const res = await api.listThemePresets(token)
        setThemes(Array.isArray(res) ? res : [])
      } catch {
        setThemes([])
      } finally {
        setThemesLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const shouldOpen = searchParams.get('create') === '1'
    if (shouldOpen) setCreateModalOpen(true)
  }, [searchParams])

  function closeCreateModal() {
    setCreateModalOpen(false)
    setCreateResumeFile(null)
    if (searchParams.get('create') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('create')
      setSearchParams(next, { replace: true })
    }
  }

  async function importResumeData(portfolioId, file) {
    if (!portfolioId || !file) return { status: '', errorMessage: '' }

    const form = new FormData()
    form.append('file', file)

    const res = await api.importPortfolioFromResume(token, portfolioId, form)
    const uploadId = res?.upload_id

    let status = String(res?.status || '').toUpperCase()
    let errorMessage = ''
    if (uploadId) {
      try {
        const statusRes = await api.getResumeUploadStatus(token, uploadId)
        status = String(statusRes?.status || status || '').toUpperCase()
        errorMessage = String(statusRes?.error || '').trim()
      } catch {
        // Fallback to import response status if status endpoint is temporarily unavailable.
      }
    }
    return { status, errorMessage }
  }

  async function onCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const rawThemeId = String(createThemeId || '').trim()
      const themeValue = rawThemeId ? Number(rawThemeId) : null
      let created = null

      if (createResumeFile) {
        const form = new FormData()
        form.append('title', createTitle)
        form.append('slug', createSlug)
        form.append('description', createDescription)
        form.append('is_published', 'false')
        form.append('resume', createResumeFile)
        if (Number.isFinite(themeValue)) form.append('theme', String(themeValue))
        created = await api.createPortfolio(token, form)
      } else {
        created = await api.createPortfolio(token, {
          title: createTitle,
          slug: createSlug,
          description: createDescription,
          theme: Number.isFinite(themeValue) ? themeValue : null,
          is_published: false
        })
      }

      let importStatus = ''
      let importError = ''
      if (createResumeFile && created?.id) {
        try {
          const importResult = await importResumeData(created.id, createResumeFile)
          importStatus = String(importResult?.status || '')
          importError = String(importResult?.errorMessage || '')
        } catch (importErr) {
          toast.error(toErrorMessage(importErr, 'Portfolio created, but resume import failed'))
        }
      }

      setCreateTitle('')
      setCreateSlug('')
      setCreateDescription('')
      setCreateThemeId('')
      setCreateResumeFile(null)

      if (!createResumeFile) {
        toast.success('Portfolio created')
      } else if (importStatus === 'COMPLETED') {
        toast.success('Portfolio created. Draft data is ready in tabs; click Save Imported Data to store it.')
      } else if (importStatus === 'FAILED') {
        toast.error(importError || 'Portfolio created, but resume draft generation failed')
      } else {
        toast.info('Portfolio created. Resume draft generation started')
      }

      closeCreateModal()
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not create portfolio'))
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
    setEditResumeFile(null)
    setEditResumeUrl(toStr(p.resume))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditSlug('')
    setEditDescription('')
    setEditThemeId('')
    setEditResumeFile(null)
    setEditResumeUrl('')
  }

  async function onSave(id) {
    setSaving(true)
    setError(null)
    try {
      const rawThemeId = String(editThemeId || '').trim()
      const themeValue = rawThemeId ? Number(rawThemeId) : null
      let importStatus = ''
      let importError = ''

      if (editResumeFile) {
        const form = new FormData()
        form.append('title', editTitle)
        form.append('slug', editSlug)
        form.append('description', editDescription)
        form.append('resume', editResumeFile)
        if (Number.isFinite(themeValue)) form.append('theme', String(themeValue))
        await api.updatePortfolio(token, id, form)

        try {
          const importResult = await importResumeData(id, editResumeFile)
          importStatus = String(importResult?.status || '')
          importError = String(importResult?.errorMessage || '')
        } catch (importErr) {
          toast.error(toErrorMessage(importErr, 'Portfolio updated, but resume import failed'))
        }
      } else {
        await api.updatePortfolio(token, id, {
          title: editTitle,
          slug: editSlug,
          description: editDescription,
          theme: Number.isFinite(themeValue) ? themeValue : null
        })
      }

      if (!editResumeFile) {
        toast.success('Portfolio updated')
      } else if (importStatus === 'COMPLETED') {
        toast.success('Portfolio updated. Draft data is ready in tabs; click Save Imported Data to store it.')
      } else if (importStatus === 'FAILED') {
        toast.error(importError || 'Portfolio updated, but resume draft generation failed')
      } else {
        toast.info('Portfolio updated. Resume draft generation started')
      }

      cancelEdit()
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not save portfolio changes'))
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
      toast.success('Portfolio deleted')
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not delete portfolio'))
    }
  }

  async function togglePublish(p) {
    if (!p?.id) return
    setPublishBusyId(p.id)
    setError(null)
    try {
      await api.updatePortfolio(token, p.id, { is_published: !p.is_published })
      toast.success(!p.is_published ? 'Portfolio published' : 'Portfolio moved to draft')
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not update publish status'))
    } finally {
      setPublishBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Portfolios"
        subtitle="Create and manage your portfolios."
        right={null}
      />

      <ErrorBanner error={error} />

      {loading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No portfolios yet" subtitle="Create your first portfolio from the top bar." />
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
                    <div className="subtle" style={{ marginTop: 4 }}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </div>
                  </div>
                  <div className="row">
                    <Button variant="ghost" onClick={() => navigate(`/app/portfolios/${p.id}`)}>Open</Button>
                    <Button
                      variant="ghost"
                      onClick={() => togglePublish(p)}
                      disabled={publishBusyId === p.id}
                    >
                      {publishBusyId === p.id ? 'Saving…' : p.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="ghost" onClick={() => startEdit(p)} disabled={isEditing}>Edit</Button>
                    <Button variant="danger" onClick={() => onDelete(p.id)}>Delete</Button>
                  </div>
                </div>

                <div className="divider" />

                {!isEditing ? (
                  <div>
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>{p.description || 'No description'}</div>
                    {p.resume ? (
                      <div style={{ marginTop: 8 }}>
                        <a className="smallLink" href={resolveAssetUrl(p.resume)} target="_blank" rel="noreferrer">View Resume</a>
                      </div>
                    ) : null}
                  </div>
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

                    <Field label="Resume File" hint="Optional. Upload a new file to replace current resume.">
                      <Input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => setEditResumeFile(e.target.files?.[0] || null)}
                      />
                      {editResumeUrl ? (
                        <div className="fieldHint">
                          Current resume: <a className="smallLink" href={resolveAssetUrl(editResumeUrl)} target="_blank" rel="noreferrer">Open</a>
                        </div>
                      ) : null}
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
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={createModalOpen}
        title="Create Portfolio"
        onClose={closeCreateModal}
        maxWidth={1080}
      >
        <form onSubmit={onCreate}>
          <Field label="Title">
            <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="My Portfolio" />
          </Field>
          <div className="layoutGrid2">
            <Field label="Slug" hint="Optional; blank auto-generates">
              <Input value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} placeholder="my-portfolio" />
            </Field>
            <Field label="Description">
              <Input value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="Short summary" />
            </Field>
          </div>

          <Field label="Resume File" hint="Optional (PDF/DOCX/TXT).">
            <Input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setCreateResumeFile(e.target.files?.[0] || null)}
            />
          </Field>

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
            <Button variant="ghost" type="button" onClick={closeCreateModal} disabled={creating}>Cancel</Button>
            <Button type="submit" disabled={creating || !createTitle.trim()}>
              {creating ? 'Creating…' : 'Create Portfolio'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
