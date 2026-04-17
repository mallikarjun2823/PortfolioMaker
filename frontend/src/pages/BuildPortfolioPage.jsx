import React from 'react'
import { Link, useParams } from 'react-router-dom'

import { Card, CardTitle, PageHeader } from '../components/Ui.jsx'

export default function BuildPortfolioPage() {
  const { portfolioId } = useParams()

  return (
    <div>
      <PageHeader
        title="Build"
        subtitle="Layout and preview. Sections live here (not in the main tabs)."
        right={<Link className="btn btnGhost" to={`/app/portfolios/${portfolioId}`}>Back to Overview</Link>}
      />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Card>
          <CardTitle>Sections</CardTitle>
          <div className="subtle">Control ordering, visibility, and config.</div>
          <div className="divider" />
          <Link className="btn" to={`/app/portfolios/${portfolioId}/sections`}>Edit Sections</Link>
        </Card>

        <Card>
          <CardTitle>Preview</CardTitle>
          <div className="subtle">See the backend-rendered JSON view.</div>
          <div className="divider" />
          <Link className="btn" to={`/app/portfolios/${portfolioId}/preview`}>Open Preview</Link>
        </Card>
      </div>
    </div>
  )
}
