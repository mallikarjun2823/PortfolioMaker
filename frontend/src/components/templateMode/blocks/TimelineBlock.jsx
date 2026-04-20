import React from 'react'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function EmptyState({ message }) {
  return <div className="tmEmpty">{message}</div>
}

function valueToString(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

export default function TimelineBlock({ items, fields }) {
  const list = asArray(items)
  const visibleFields = asArray(fields)

  if (!list.length) {
    return <EmptyState message="No data available" />
  }

  const companyField = visibleFields[0] || 'company'
  const roleField = visibleFields[1] || 'role'
  const timelineField = visibleFields[2] || 'timeline'

  return (
    <div className="tmTimeline">
      {list.map((item, index) => {
        const company = valueToString(item?.[companyField]) || `Company ${index + 1}`
        const role = valueToString(item?.[roleField])
        const timeline = valueToString(item?.[timelineField])

        return (
          <article key={item?.id || `${company}-${index}`} className="tmTimelineItem">
            <div className="tmTimelineDot" aria-hidden="true" />
            <div className="tmTimelineContent">
              <div className="tmTimelineTop">
                <h3 className="tmTimelineCompany">{company}</h3>
                {timeline ? <span className="tmTimelinePeriod">{timeline}</span> : null}
              </div>
              {role ? <p className="tmTimelineRole">{role}</p> : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
