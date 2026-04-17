import React from 'react'

import { asArray, extractArray, extractText, isObject, stringifyValue } from './utils.js'

function formatDateRange(item) {
  if (!isObject(item)) return null
  const start = extractText(item, ['start', 'start_date', 'from'])
  const end = extractText(item, ['end', 'end_date', 'to'])
  if (start && end) return `${start} — ${end}`
  return start || end || null
}

export default function TimelineBlock({ items }) {
  const rows = asArray(items)
  if (rows.length === 0) return null

  return (
    <div className="timeline">
      {rows.map((raw, idx) => {
        const item = isObject(raw) ? raw : { title: stringifyValue(raw) }

        const title =
          extractText(item, ['role', 'title', 'position', 'degree']) ||
          extractText(item, ['name']) ||
          `Experience ${idx + 1}`

        const org = extractText(item, ['company', 'org', 'organization', 'institution'])
        const period =
          extractText(item, ['period', 'timeline', 'duration', 'date']) ||
          formatDateRange(item)

        const highlights = extractArray(item, ['highlights', 'points', 'bullets'])

        return (
          <div key={idx} className="timelineItem">
            <div className="timelineDot" aria-hidden="true" />
            <div className="timelineContent">
              <div className="timelineTop">
                <div className="timelineTitle">{title}</div>
                {period ? <div className="timelinePeriod">{period}</div> : null}
              </div>
              {org ? <div className="timelineOrg">{org}</div> : null}

              {highlights.length ? (
                <ul className="timelineList">
                  {highlights.slice(0, 6).map((h, hIdx) => (
                    <li key={`${h}-${hIdx}`}>{h}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
