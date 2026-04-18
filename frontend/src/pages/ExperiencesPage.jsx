import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { toErrorMessage, useToast } from '../services/toast.jsx'
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, PageHeader } from '../components/Ui.jsx'

export default function ExperiencesPage() {
  const { token } = useAuth()
  const toast = useToast()
  const { portfolioId } = useParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [creating, setCreating] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [timeline, setTimeline] = useState('')
  const [order, setOrder] = useState('')
  const [isVisible, setIsVisible] = useState(true)

  const [editingId, setEditingId] = useState(null)
  const [edit, setEdit] = useState({ company: '', role: '', timeline: '', order: '', is_visible: true })
  const [savingId, setSavingId] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listExperiences(token, portfolioId)
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
        company,
        role,
        timeline,
        is_visible: !!isVisible
      }
      if (order !== '') payload.order = Number(order)

      await api.createExperience(token, portfolioId, payload)
      toast.success('Experience created')
      setCompany('')
      setRole('')
      setTimeline('')
      setOrder('')
      setIsVisible(true)
      setCreateModalOpen(false)
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not create experience'))
    } finally {
      setCreating(false)
    }
  }

  function startEdit(e) {
    setEditingId(e.id)
    setEdit({
      company: e.company || '',
      role: e.role || '',
      timeline: e.timeline || '',
      order: e.order ?? '',
      is_visible: !!e.is_visible
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEdit({ company: '', role: '', timeline: '', order: '', is_visible: true })
  }

  async function onSave(e) {
    setSavingId(e.id)
    setError(null)
    try {
      const payload = {
        company: edit.company,
        role: edit.role,
        timeline: edit.timeline,
        is_visible: !!edit.is_visible
      }
      if (edit.order !== '') payload.order = Number(edit.order)

      await api.updateExperience(token, portfolioId, e.id, payload)
      toast.success('Experience updated')
      cancelEdit()
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not save experience changes'))
    } finally {
      setSavingId(null)
    }
  }

  async function onDelete(e) {
    const ok = confirm('Delete this experience?')
    if (!ok) return

    setError(null)
    try {
      await api.deleteExperience(token, portfolioId, e.id)
      toast.success('Experience deleted')
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not delete experience'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Experiences"
        subtitle="Capture roles, companies and timelines."
        right={
          <div className="row">
            <Button onClick={() => setCreateModalOpen(true)}>+ Add New Experience</Button>
            <Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {loading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No experiences yet" subtitle="Click + Add New Experience." />
      ) : (
        <div className="grid">
          {items.map((e) => {
            const isEditing = editingId === e.id
            return (
              <Card key={e.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{e.company}</div>
                    <div className="subtle">{e.role} • {e.timeline}</div>
                    <div className="subtle">Order #{e.order} • {e.is_visible ? 'Visible' : 'Hidden'}</div>
                  </div>
                  <div className="row">
                    <Button variant="ghost" onClick={() => startEdit(e)} disabled={isEditing}>Edit</Button>
                    <Button variant="danger" onClick={() => onDelete(e)}>Delete</Button>
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div className="divider" />
                    <Field label="Company">
                      <Input value={edit.company} onChange={(x) => setEdit((s) => ({ ...s, company: x.target.value }))} />
                    </Field>
                    <Field label="Role">
                      <Input value={edit.role} onChange={(x) => setEdit((s) => ({ ...s, role: x.target.value }))} />
                    </Field>
                    <Field label="Timeline">
                      <Input value={edit.timeline} onChange={(x) => setEdit((s) => ({ ...s, timeline: x.target.value }))} />
                    </Field>
                    <Field label="Order">
                      <Input value={edit.order} onChange={(x) => setEdit((s) => ({ ...s, order: x.target.value }))} />
                    </Field>
                    <label className="checkbox" style={{ marginBottom: 10 }}>
                      <input type="checkbox" checked={edit.is_visible} onChange={(x) => setEdit((s) => ({ ...s, is_visible: x.target.checked }))} />
                      <span>Visible</span>
                    </label>

                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={cancelEdit} disabled={savingId === e.id}>Cancel</Button>
                      <Button onClick={() => onSave(e)} disabled={savingId === e.id || !edit.company.trim() || !edit.role.trim() || !edit.timeline.trim()}>
                        {savingId === e.id ? 'Saving…' : 'Save'}
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
        title="Create Experience"
        subtitle="Create form opens only when you click + Add New Experience."
        onClose={() => setCreateModalOpen(false)}
      >
        <form onSubmit={onCreate}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Company">
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="TechCorp" />
            </Field>
            <Field label="Role">
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Backend Engineer" />
            </Field>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field label="Timeline" hint="Example: 2024 - Present">
              <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="2024 - Present" />
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
              <Button type="submit" disabled={creating || !company.trim() || !role.trim() || !timeline.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
