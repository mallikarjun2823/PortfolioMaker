import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { Card, CardTitle, EmptyState, ErrorBanner, PageHeader, Pill } from '../components/Ui.jsx'

export default function PortfolioOverviewPage() {
  const { token } = useAuth()
  const { portfolioId } = useParams()

  const [portfolio, setPortfolio] = useState(null)
  const [projects, setProjects] = useState([])
  const [skills, setSkills] = useState([])
  const [experiences, setExperiences] = useState([])
  const [sections, setSections] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [p, pr, sk, ex, se] = await Promise.all([
        api.getPortfolio(token, portfolioId),
        api.listProjects(token, portfolioId),
        api.listSkills(token, portfolioId),
        api.listExperiences(token, portfolioId),
        api.listSections(token, portfolioId)
      ])

      setPortfolio(p || null)
      setProjects(Array.isArray(pr) ? pr : [])
      setSkills(Array.isArray(sk) ? sk : [])
      setExperiences(Array.isArray(ex) ? ex : [])
      setSections(Array.isArray(se) ? se : [])
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

  const visibleSections = sections.filter((s) => s.is_visible)

  return (
    <div>
      <PageHeader
        title={portfolio ? portfolio.title : 'Portfolio'}
        subtitle={portfolio ? (portfolio.description || 'No description') : 'Overview'}
        right={
          <div className="row">
            <Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}/build`}>Build</Link>
            <Link className="btn" to={`/app/portfolios/${portfolioId}/projects`}>Edit Data</Link>
          </div>
        }
      />

      <ErrorBanner error={error} />

      {loading ? (
        <div style={{ padding: 12, color: 'var(--muted)' }}>Loading…</div>
      ) : !portfolio ? (
        <EmptyState title="Portfolio not found" subtitle="This portfolio might not exist or you might not have access." />
      ) : (
        <div className="layoutGrid2">
          <Card>
            <CardTitle>Sections</CardTitle>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Pill>{sections.length} total</Pill>
              <Pill>{visibleSections.length} visible</Pill>
            </div>
            <div className="divider" />
            {sections.length === 0 ? (
              <div className="subtle">No sections yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {sections.slice(0, 6).map((s) => (
                  <div key={s.id} className="kv">
                    <div className="kvKey">#{s.order}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div className="subtle">{s.is_visible ? 'Visible' : 'Hidden'}</div>
                    </div>
                  </div>
                ))}
                {sections.length > 6 ? <div className="subtle">+{sections.length - 6} more</div> : null}
              </div>
            )}
          </Card>

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
    </div>
  )
}
