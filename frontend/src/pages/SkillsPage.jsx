import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { toErrorMessage, useToast } from '../services/toast.jsx'
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, PageHeader } from '../components/Ui.jsx'

export default function SkillsPage() {
  const { token } = useAuth()
  const toast = useToast()
  const { portfolioId } = useParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [creating, setCreating] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [order, setOrder] = useState('')
  const [isVisible, setIsVisible] = useState(true)

  const [editingId, setEditingId] = useState(null)
  const [edit, setEdit] = useState({ name: '', level: '', order: '', is_visible: true })
  const [savingId, setSavingId] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listSkills(token, portfolioId)
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
        level: Number(level),
        is_visible: !!isVisible
      }
      if (order !== '') payload.order = Number(order)

      await api.createSkill(token, portfolioId, payload)
      toast.success('Skill created')
      setName('')
      setLevel('')
      setOrder('')
      setIsVisible(true)
      setCreateModalOpen(false)
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not create skill'))
    } finally {
      setCreating(false)
    }
  }

  function startEdit(s) {
    setEditingId(s.id)
    setEdit({
      name: s.name || '',
      level: s.level ?? '',
      order: s.order ?? '',
      is_visible: !!s.is_visible
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEdit({ name: '', level: '', order: '', is_visible: true })
  }

  async function onSave(s) {
    setSavingId(s.id)
    setError(null)
    try {
      const payload = {
        name: edit.name,
        level: Number(edit.level),
        is_visible: !!edit.is_visible
      }
      if (edit.order !== '') payload.order = Number(edit.order)

      await api.updateSkill(token, portfolioId, s.id, payload)
      toast.success('Skill updated')
      cancelEdit()
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not save skill changes'))
    } finally {
      setSavingId(null)
    }
  }

  async function onDelete(s) {
    const ok = confirm('Delete this skill?')
    if (!ok) return

    setError(null)
    try {
      await api.deleteSkill(token, portfolioId, s.id)
      toast.success('Skill deleted')
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not delete skill'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Skills"
        subtitle="Maintain a clean skill list with levels and ordering."
        right={
          <div className="row">
            <Button onClick={() => setCreateModalOpen(true)}>+ Add New Skill</Button>
            <Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {loading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No skills yet" subtitle="Click + Add New Skill." />
      ) : (
        <div className="grid">
          {items.map((s) => {
            const isEditing = editingId === s.id
            return (
              <Card key={s.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{s.name}</div>
                    <div className="subtle">Level {s.level} • Order #{s.order} • {s.is_visible ? 'Visible' : 'Hidden'}</div>
                  </div>
                  <div className="row">
                    <Button variant="ghost" onClick={() => startEdit(s)} disabled={isEditing}>Edit</Button>
                    <Button variant="danger" onClick={() => onDelete(s)}>Delete</Button>
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div className="divider" />
                    <Field label="Name">
                      <Input value={edit.name} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} />
                    </Field>
                    <Field label="Level">
                      <Input value={edit.level} onChange={(e) => setEdit((x) => ({ ...x, level: e.target.value }))} />
                    </Field>
                    <Field label="Order">
                      <Input value={edit.order} onChange={(e) => setEdit((x) => ({ ...x, order: e.target.value }))} />
                    </Field>
                    <label className="checkbox" style={{ marginBottom: 10 }}>
                      <input type="checkbox" checked={edit.is_visible} onChange={(e) => setEdit((x) => ({ ...x, is_visible: e.target.checked }))} />
                      <span>Visible</span>
                    </label>

                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={cancelEdit} disabled={savingId === s.id}>Cancel</Button>
                      <Button onClick={() => onSave(s)} disabled={savingId === s.id || !edit.name.trim() || edit.level === ''}>
                        {savingId === s.id ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={createModalOpen}
        title="Create Skill"
        onClose={() => setCreateModalOpen(false)}
      >
        <form onSubmit={onCreate}>
          <div className="layoutGrid3">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Django" />
            </Field>
            <Field label="Level" hint="Number (e.g., 1-10)">
              <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="8" />
            </Field>
            <Field label="Order" hint="Optional">
              <Input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="1" />
            </Field>
          </div>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <label className="checkbox">
              <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
              <span>Visible</span>
            </label>
            <div className="row">
              <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" disabled={creating || !name.trim() || level === ''}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
