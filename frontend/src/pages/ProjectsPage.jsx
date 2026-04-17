import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { Button, Card, CardTitle, EmptyState, ErrorBanner, Field, Input, PageHeader, Textarea } from '../components/Ui.jsx'

export default function ProjectsPage() {
  const { token } = useAuth()
  const { portfolioId } = useParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [order, setOrder] = useState('')
  const [isVisible, setIsVisible] = useState(true)

  const [editingId, setEditingId] = useState(null)
  const [edit, setEdit] = useState({ title: '', description: '', github_url: '', order: '', is_visible: true })
  const [savingId, setSavingId] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listProjects(token, portfolioId)
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
        title,
        description,
        github_url: githubUrl || null,
        is_visible: !!isVisible
      }
      if (order !== '') payload.order = Number(order)

      await api.createProject(token, portfolioId, payload)
      alert('Project created')
      setTitle('')
      setDescription('')
      setGithubUrl('')
      setOrder('')
      setIsVisible(true)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEdit({
      title: p.title || '',
      description: p.description || '',
      github_url: p.github_url || '',
      order: p.order ?? '',
      is_visible: !!p.is_visible
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEdit({ title: '', description: '', github_url: '', order: '', is_visible: true })
  }

  async function onSave(p) {
    setSavingId(p.id)
    setError(null)
    try {
      const payload = {
        title: edit.title,
        description: edit.description,
        github_url: edit.github_url || null,
        is_visible: !!edit.is_visible
      }
      if (edit.order !== '') payload.order = Number(edit.order)

      await api.updateProject(token, portfolioId, p.id, payload)
      alert('Saved')
      cancelEdit()
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setSavingId(null)
    }
  }

  async function onDelete(p) {
    const ok = confirm('Delete this project?')
    if (!ok) return

    setError(null)
    try {
      await api.deleteProject(token, portfolioId, p.id)
      alert('Deleted')
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Create, edit and delete projects. Changes always reflect backend state."
        right={<Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>}
      />

      <ErrorBanner error={error} />

      <Card>
        <CardTitle>Create Project</CardTitle>
        <form onSubmit={onCreate}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" />
            </Field>
            <Field label="Order" hint="Optional; used for sorting">
              <Input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="1" />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you build?" />
          </Field>
          <Field label="GitHub URL" hint="Optional">
            <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/user/repo" />
          </Field>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <label className="checkbox">
              <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
              <span>Visible</span>
            </label>
            <Button type="submit" disabled={creating || !title.trim() || !description.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>

      <div style={{ height: 14 }} />

      {loading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No projects yet" subtitle="Create your first project above." />
      ) : (
        <div className="grid">
          {items.map((p) => {
            const isEditing = editingId === p.id
            return (
              <Card key={p.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{p.title}</div>
                    <div className="subtle">Order #{p.order} • {p.is_visible ? 'Visible' : 'Hidden'}</div>
                  </div>
                  <div className="row">
                    <Button variant="ghost" onClick={() => startEdit(p)} disabled={isEditing}>Edit</Button>
                    <Button variant="danger" onClick={() => onDelete(p)}>Delete</Button>
                  </div>
                </div>

                <div className="divider" />

                {!isEditing ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'pre-wrap' }}>{p.description}</div>
                ) : (
                  <div>
                    <Field label="Title">
                      <Input value={edit.title} onChange={(e) => setEdit((x) => ({ ...x, title: e.target.value }))} />
                    </Field>
                    <Field label="Order">
                      <Input value={edit.order} onChange={(e) => setEdit((x) => ({ ...x, order: e.target.value }))} />
                    </Field>
                    <Field label="Description">
                      <Textarea value={edit.description} onChange={(e) => setEdit((x) => ({ ...x, description: e.target.value }))} />
                    </Field>
                    <Field label="GitHub URL">
                      <Input value={edit.github_url} onChange={(e) => setEdit((x) => ({ ...x, github_url: e.target.value }))} />
                    </Field>
                    <label className="checkbox" style={{ marginBottom: 10 }}>
                      <input type="checkbox" checked={edit.is_visible} onChange={(e) => setEdit((x) => ({ ...x, is_visible: e.target.checked }))} />
                      <span>Visible</span>
                    </label>

                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={cancelEdit} disabled={savingId === p.id}>Cancel</Button>
                      <Button onClick={() => onSave(p)} disabled={savingId === p.id || !edit.title.trim() || !edit.description.trim()}>
                        {savingId === p.id ? 'Saving…' : 'Save'}
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
