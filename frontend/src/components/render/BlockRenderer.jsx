import React from 'react'

import Reveal from './Reveal.jsx'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickText(config, keys) {
  if (!isObject(config)) return null
  for (const k of keys) {
    const v = config[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function looksLikeUrl(value) {
  if (typeof value !== 'string') return false
  const v = value.trim().toLowerCase()
  return v.startsWith('http://') || v.startsWith('https://')
}

function looksLikeImageUrl(value) {
  if (typeof value !== 'string') return false
  const v = value.toLowerCase().trim()
  if (v.startsWith('http://') || v.startsWith('https://')) return /\.(png|jpg|jpeg|gif|webp|svg)(\?|#|$)/.test(v)
  if (v.startsWith('/media/') || v.startsWith('media/')) return true
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?|#|$)/.test(v)
}

function stringifyValue(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(' • ')
  if (isObject(value)) {
    const compact = Object.entries(value)
      .slice(0, 6)
      .map(([k, v]) => `${k}: ${stringifyValue(v)}`)
      .filter(Boolean)
      .join(' • ')
    return compact
  }
  return String(value)
}

function extractText(obj, keys) {
  if (!isObject(obj)) return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number') return String(v)
  }
  return null
}

function extractArray(obj, keys) {
  if (!isObject(obj)) return []
  for (const k of keys) {
    const v = obj[k]
    if (Array.isArray(v)) return v.map((x) => stringifyValue(x)).filter(Boolean)
    if (typeof v === 'string' && v.trim()) {
      return v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

function extractUrl(obj, keys, { github = false } = {}) {
  if (!isObject(obj)) return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v !== 'string') continue
    const raw = v.trim()
    if (!raw) continue
    if (looksLikeUrl(raw)) return raw

    if (github) {
      if (raw.includes('github.com')) return raw.startsWith('http') ? raw : `https://${raw}`
      if (/^[\w.-]+\/[\w.-]+$/.test(raw)) return `https://github.com/${raw}`
    }
  }
  return null
}

function ProjectsGrid({ items }) {
  const projects = asArray(items)
  if (projects.length === 0) return null

  return (
    <div className="projectsGrid">
      {projects.map((raw, idx) => {
        const item = isObject(raw) ? raw : { title: stringifyValue(raw) }

        const title =
          extractText(item, ['title', 'name', 'project', 'heading']) ||
          `Project ${idx + 1}`
        const description = extractText(item, ['description', 'summary', 'details', 'about'])
        const github = extractUrl(item, ['github', 'github_url', 'repo', 'repo_url'], { github: true })
        const live = extractUrl(item, ['url', 'link', 'live', 'live_url', 'website'])
        const tags = extractArray(item, ['tags', 'tech', 'stack', 'skills'])
        const image = extractUrl(item, ['image', 'image_url', 'cover', 'thumbnail']) || null

        return (
          <article key={idx} className="projectCard">
            <div className="projectCardTop">
              {image && looksLikeImageUrl(image) ? (
                <img className="projectImage" src={image} alt="" />
              ) : (
                <div className="projectImagePlaceholder" aria-hidden="true" />
              )}
            </div>
            <div className="projectCardBody">
              <div className="projectTitle">{title}</div>
              {description ? <div className="projectDescription">{description}</div> : null}

              {tags.length ? (
                <div className="tagRow" aria-label="Technologies">
                  {tags.slice(0, 10).map((t, tIdx) => (
                    <span key={`${t}-${tIdx}`} className="tagPill">{t}</span>
                  ))}
                </div>
              ) : null}

              {(github || live) ? (
                <div className="projectActions">
                  {github ? (
                    <a className="siteButton siteButtonGhost" href={github} target="_blank" rel="noreferrer">GitHub</a>
                  ) : null}
                  {live ? (
                    <a className="siteButton" href={live} target="_blank" rel="noreferrer">Live</a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function SkillTags({ items }) {
  const rows = asArray(items)
  const tags = rows
    .map((r) => {
      if (typeof r === 'string') return r.trim()
      if (typeof r === 'number') return String(r)
      if (isObject(r)) {
        return (
          extractText(r, ['name', 'title', 'label', 'skill']) ||
          extractText(r, ['value'])
        )
      }
      return ''
    })
    .filter(Boolean)

  if (tags.length === 0) return null

  return (
    <div className="tagRow">
      {tags.map((t, idx) => (
        <span key={`${t}-${idx}`} className="tagPill">{t}</span>
      ))}
    </div>
  )
}

function formatDateRange(item) {
  if (!isObject(item)) return null
  const start = extractText(item, ['start', 'start_date', 'from'])
  const end = extractText(item, ['end', 'end_date', 'to'])
  if (start && end) return `${start} — ${end}`
  return start || end || null
}

function ExperienceTimeline({ items }) {
  const rows = asArray(items)
  if (rows.length === 0) return null

  return (
    <div className="timeline">
      {rows.map((raw, idx) => {
        const item = isObject(raw) ? raw : { title: stringifyValue(raw) }
        const role = extractText(item, ['role', 'title', 'position']) || extractText(item, ['name']) || `Experience ${idx + 1}`
        const company = extractText(item, ['company', 'org', 'organization'])
        const location = extractText(item, ['location', 'place'])
        const period = extractText(item, ['period', 'timeline', 'date']) || formatDateRange(item)
        const summary = extractText(item, ['description', 'summary', 'details'])
        const highlights = extractArray(item, ['highlights', 'points', 'bullets'])

        return (
          <div key={idx} className="timelineItem">
            <div className="timelineDot" aria-hidden="true" />
            <div className="timelineCard">
              <div className="timelineTop">
                <div>
                  <div className="timelineRole">{role}</div>
                  {(company || location) ? (
                    <div className="timelineMeta">{[company, location].filter(Boolean).join(' • ')}</div>
                  ) : null}
                </div>
                {period ? <div className="timelinePeriod">{period}</div> : null}
              </div>

              {summary ? <div className="timelineSummary">{summary}</div> : null}

              {highlights.length ? (
                <ul className="timelineHighlights">
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

function normalizeKeyValuePairs(items) {
  const pairs = []
  for (const row of asArray(items)) {
    if (!row) continue
    if (isObject(row) && 'key' in row && 'value' in row) {
      pairs.push([String(row.key || ''), row.value])
      continue
    }
    if (isObject(row) && 'label' in row && 'value' in row) {
      pairs.push([String(row.label || ''), row.value])
      continue
    }
    if (isObject(row)) {
      for (const [k, v] of Object.entries(row)) pairs.push([String(k || ''), v])
      continue
    }
    pairs.push(['', row])
  }
  return pairs
    .map(([k, v]) => [String(k || '').trim(), v])
    .filter(([, v]) => stringifyValue(v).trim())
}

function ProfileKeyValues({ items }) {
  const pairs = normalizeKeyValuePairs(items)
  if (pairs.length === 0) return null

  return (
    <div className="profileGrid">
      {pairs.map(([k, v], idx) => (
        <div key={`${k}-${idx}`} className="profileItem">
          {k ? <div className="profileLabel">{k}</div> : null}
          <div className="profileValue">{stringifyValue(v)}</div>
        </div>
      ))}
    </div>
  )
}

function ImageGallery({ items }) {
  const rows = asArray(items)
  const urls = []
  for (const row of rows) {
    if (typeof row === 'string' && looksLikeImageUrl(row)) urls.push(row)
    if (!isObject(row)) continue
    for (const v of Object.values(row)) {
      if (typeof v === 'string' && looksLikeImageUrl(v)) urls.push(v)
    }
  }

  if (urls.length === 0) return null

  return (
    <div className="imageGrid">
      {urls.slice(0, 12).map((src, idx) => (
        <div key={`${src}-${idx}`} className="imageCard">
          <img src={src} alt="" loading="lazy" />
        </div>
      ))}
    </div>
  )
}

function RichList({ items }) {
  const rows = asArray(items)
  if (rows.length === 0) return null

  return (
    <div className="richList">
      {rows.map((raw, idx) => {
        const item = isObject(raw) ? raw : { title: stringifyValue(raw) }
        const title = extractText(item, ['title', 'name', 'label']) || `Item ${idx + 1}`
        const description = extractText(item, ['description', 'summary', 'details', 'value'])
        return (
          <div key={idx} className="richListItem">
            <div className="richListTitle">{title}</div>
            {description ? <div className="richListDesc">{description}</div> : null}
          </div>
        )
      })}
    </div>
  )
}

export default function BlockRenderer({ block, index = 0 }) {
  if (!block) return null

  const type = String(block.type || '').toUpperCase()
  const items = asArray(block.items)
  if (items.length === 0) return null

  const heading = pickText(block.config, ['title', 'heading', 'label'])
  const subheading = pickText(block.config, ['subtitle', 'description'])

  return (
    <Reveal delay={Math.min(index * 70, 280)}>
      <div className="siteBlock">
        {(heading || subheading) ? (
          <div className="blockHeader">
            {heading ? <div className="blockTitle">{heading}</div> : null}
            {subheading ? <div className="blockSubtitle">{subheading}</div> : null}
          </div>
        ) : null}

        {type === 'GRID' ? (
          <ProjectsGrid items={items} />
        ) : type === 'LIST' ? (
          <SkillTags items={items} />
        ) : type === 'TIMELINE' ? (
          <ExperienceTimeline items={items} />
        ) : type === 'KEY_VALUE' ? (
          <ProfileKeyValues items={items} />
        ) : type === 'IMAGE' ? (
          <ImageGallery items={items} />
        ) : (
          <RichList items={items} />
        )}
      </div>
    </Reveal>
  )
}
