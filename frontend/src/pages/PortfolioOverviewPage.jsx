import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { toErrorMessage, useToast } from '../services/toast.jsx'
import { Button, Card, CardTitle, EmptyState, ErrorBanner, Field, Input, Modal, PageHeader, Pill } from '../components/Ui.jsx'
import AnalyticsCard from '../components/AnalyticsCard.jsx'

export default function PortfolioOverviewPage() {
  const { token } = useAuth()
  const toast = useToast()
  const { portfolioId } = useParams()

  const [portfolio, setPortfolio] = useState(null)
  const [projects, setProjects] = useState([])
  const [skills, setSkills] = useState([])
  const [experiences, setExperiences] = useState([])
  const [analytics, setAnalytics] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [lastImportStatus, setLastImportStatus] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const overview = await api.getPortfolioOverview(token, portfolioId)

      setPortfolio(overview?.portfolio || null)
      setProjects(Array.isArray(overview?.projects) ? overview.projects : [])
      setSkills(Array.isArray(overview?.skills) ? overview.skills : [])
        setAnalytics(overview?.analytics || null)

      const experienceList = Array.isArray(overview?.experience)
        ? overview.experience
        : (Array.isArray(overview?.experiences) ? overview.experiences : [])
      setExperiences(experienceList)
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

  async function handleImportResume(e) {
    e.preventDefault()
    if (!importFile) return

    setImporting(true)
    setError(null)
    try {
      const payload = new FormData()
      payload.append('file', importFile)

      const res = await api.importPortfolioFromResume(token, portfolioId, payload)
      const uploadId = res?.upload_id

      let effectiveStatus = String(res?.status || '').toUpperCase()
      let statusError = ''
      if (uploadId) {
        try {
          const statusRes = await api.getResumeUploadStatus(token, uploadId)
          effectiveStatus = String(statusRes?.status || effectiveStatus || '').toUpperCase()
          statusError = String(statusRes?.error || '').trim()
        } catch {
          // Ignore status polling failures and fallback to import response.
        }
      }

      setLastImportStatus(effectiveStatus)

      if (effectiveStatus === 'COMPLETED') {
        toast.success('Resume parsed. Tabs are now auto-populated as draft; click Save Imported Data in tabs to persist.')
      } else if (effectiveStatus === 'FAILED') {
        toast.error(statusError || 'Resume import failed. Please check the file and try again.')
      } else {
        toast.info('Resume import submitted. Generating draft data...')
      }

      setImportFile(null)
      setImportOpen(false)
      await load()
    } catch (err) {
      setError(err)
      toast.error(toErrorMessage(err, 'Could not import portfolio data from resume'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={portfolio ? portfolio.title : 'Portfolio'}
        subtitle={portfolio ? (portfolio.description || 'No description') : 'Overview'}
        right={
          <div className="row">
            <Button variant="ghost" onClick={() => setImportOpen(true)}>Import Resume</Button>
            <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/build`}>Build</Link>
            <Link className="btn" to={`/app/portfolios/${portfolioId}/projects`}>Edit Data</Link>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {lastImportStatus ? (
        <div className="subtle" style={{ marginBottom: 12 }}>
          Last resume import status: {lastImportStatus}
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : !portfolio ? (
        <EmptyState title="Portfolio not found" subtitle="This portfolio might not exist or you might not have access." />
      ) : (
        <div className="layoutGrid2">
          <AnalyticsCard analytics={analytics} />
          <Card>
            <CardTitle>Projects</CardTitle>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Pill>{projects.length} total</Pill>
              <Link className="smallLink" to={`/app/portfolios/${portfolioId}/projects`}>Manage</Link>
            </div>
            <div className="divider" />
            {projects.length === 0 ? (
              <div className="subtle">No projects yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {projects.slice(0, 5).map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{p.title}</div>
                    <div className="subtle">#{p.order}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>Skills</CardTitle>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Pill>{skills.length} total</Pill>
              <Link className="smallLink" to={`/app/portfolios/${portfolioId}/skills`}>Manage</Link>
            </div>
            <div className="divider" />
            {skills.length === 0 ? (
              <div className="subtle">No skills yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {skills.slice(0, 6).map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div className="subtle">Level {s.level}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>Experiences</CardTitle>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Pill>{experiences.length} total</Pill>
              <Link className="smallLink" to={`/app/portfolios/${portfolioId}/experiences`}>Manage</Link>
            </div>
            <div className="divider" />
            {experiences.length === 0 ? (
              <div className="subtle">No experiences yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {experiences.slice(0, 5).map((e) => (
                  <div key={e.id}>
                    <div style={{ fontWeight: 700 }}>{e.company}</div>
                    <div className="subtle">{e.role} • {e.timeline}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={importOpen}
        title="Import Portfolio Using Resume"
        subtitle="Upload a resume to auto-generate projects, skills, and experiences."
        onClose={() => {
          if (importing) return
          setImportOpen(false)
        }}
      >
        <form onSubmit={handleImportResume}>
          <Field label="Resume File" hint="Supported formats: PDF, DOCX, TXT (max 10MB)">
            <Input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setImportOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={importing || !importFile}>
              {importing ? 'Importing…' : 'Import Resume'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
