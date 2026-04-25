import React, { useState, useRef, useMemo } from 'react'
import { Card, CardTitle, Pill } from './Ui.jsx'

function BarChart({ data = [], width = 260, height = 72, barColor = 'var(--primary)' }) {
  const containerRef = useRef(null)
  const [hover, setHover] = useState(null)

  const values = Array.isArray(data) ? data.map((d) => Number(d.count || 0)) : []
  const labels = Array.isArray(data) ? data.map((d) => d.date) : []

  const padding = { left: 10, right: 10, top: 8, bottom: 18 }
  const plotWidth = Math.max(40, width - padding.left - padding.right)
  const plotHeight = Math.max(20, height - padding.top - padding.bottom)

  const n = Math.max(1, values.length)
  const step = plotWidth / n
  const barWidth = Math.max(6, Math.min(32, Math.floor(step * 0.6)))

  const maxVal = Math.max(...values, 1)

  const points = values.map((v, i) => {
    const x = Math.round(padding.left + i * step + (step - barWidth) / 2)
    const h = maxVal > 0 ? Math.round((v / maxVal) * plotHeight) : 0
    const y = Math.round(padding.top + (plotHeight - h))
    return { x, y, h, value: v, label: labels[i] }
  })

  return (
    <div style={{ position: 'relative', width: width, height: height }} ref={containerRef}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x}
              y={p.y}
              width={barWidth}
              height={Math.max(2, p.h)}
              rx={3}
              fill={barColor}
              opacity={hover === i ? 0.95 : 0.85}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
        {/* baseline */}
        <line x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight + 1} y2={padding.top + plotHeight + 1} stroke="rgba(0,0,0,0.06)" />
      </svg>

      {hover !== null && points[hover] ? (
        <div
          style={{
            position: 'absolute',
            left: points[hover].x + barWidth / 2,
            top: points[hover].y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'var(--card)',
            boxShadow: '0 6px 16px rgba(2,6,23,0.12)',
            padding: '6px 8px',
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(points[hover].label).toLocaleDateString()}</div>
          <div style={{ fontWeight: 700 }}>{points[hover].value} view{points[hover].value === 1 ? '' : 's'}</div>
        </div>
      ) : null}
    </div>
  )
}

export default function AnalyticsCard({ analytics }) {
  if (!analytics) {
    return (
      <Card>
        <CardTitle>Analytics</CardTitle>
        <div style={{ color: 'var(--muted)' }}>No analytics yet.</div>
      </Card>
    )
  }

  const { total_views = 0, unique_visitors = 0, views_per_day = [] } = analytics

  // Ensure last 7 days ordering (views_per_day is expected to be in chronological order)
  const days = Array.isArray(views_per_day) ? views_per_day.slice(-7) : []

  return (
    <Card>
      <CardTitle>Analytics</CardTitle>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill>Total: {total_views}</Pill>
          <Pill>Visitors: {unique_visitors}</Pill>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{days.length} day(s)</div>
      </div>
      <div className="divider" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <BarChart data={days} width={360} height={96} barColor="var(--primary)" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
          {days.map((d) => (
            <div key={d.date} style={{ textAlign: 'center', minWidth: 36 }}>{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}</div>
          ))}
        </div>
      </div>
    </Card>
  )
}
