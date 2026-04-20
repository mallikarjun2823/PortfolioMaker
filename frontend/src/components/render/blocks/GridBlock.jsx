import React from 'react'

import {
  asArray,
  extractArray,
  extractText,
  extractUrl,
  isObject,
  looksLikeImageUrl,
  stringifyValue
} from './utils.js'

function primitiveValues(item) {
  if (!isObject(item)) return []
  const values = []
  for (const value of Object.values(item)) {
    if (typeof value === 'string' && value.trim()) values.push(value.trim())
    else if (typeof value === 'number') values.push(String(value))
  }
  return values
}

export default function GridBlock({ items }) {
  const rows = asArray(items)
  if (rows.length === 0) return null

  const titleKeys = ['title', 'name', 'project', 'project name', 'project_name', 'heading', 'skills', 'skill', 'skill name', 'skill_name', 'skillname']
  const descriptionKeys = ['description', 'summary', 'details', 'about', 'level', 'proficiency', 'rating']
  const githubKeys = ['github', 'github url', 'github_url', 'repository', 'repo', 'repo_url']
  const liveKeys = ['url', 'link', 'live', 'live url', 'live_url', 'website']
  const tagKeys = ['tags', 'tech', 'stack', 'skills', 'technologies']
  const imageKeys = ['image', 'image_url', 'cover', 'thumbnail', 'preview']

  const projects = rows
    .map((raw) => (isObject(raw) ? raw : { title: stringifyValue(raw) }))
    .filter((item) => {
      const genericValues = primitiveValues(item)
      const rawTitle = extractText(item, titleKeys) || genericValues[0] || null
      const rawDesc = extractText(item, descriptionKeys) || genericValues[1] || null
      const rawGithub = extractUrl(item, githubKeys, { github: true })
      const rawLive = extractUrl(item, liveKeys)
      const rawImage = extractUrl(item, imageKeys)
      return Boolean(rawTitle || rawDesc || rawGithub || rawLive || rawImage)
    })

  if (projects.length === 0) return null

  return (
    <div className="pfGrid">
      {projects.map((item, idx) => {
        const genericValues = primitiveValues(item)
        const title = extractText(item, titleKeys) || genericValues[0] || `Item ${idx + 1}`
        const fallbackDescription = genericValues.find((value) => {
          const text = String(value || '').trim()
          if (!text) return false
          if (text === title) return false
          return !looksLikeImageUrl(text)
        })
        const description = extractText(item, descriptionKeys) || fallbackDescription || null
        const github = extractUrl(item, githubKeys, { github: true })
        const live = extractUrl(item, liveKeys)
        const tags = extractArray(item, tagKeys)
        const image = extractUrl(item, imageKeys) || null

        return (
          <article key={idx} className="card">
            {image && looksLikeImageUrl(image) ? (
              <div className="cardMedia">
                <img className="cardImg" src={image} alt="" loading="lazy" />
              </div>
            ) : null}

            <div className="cardBody">
              <h3 className="cardTitle">{title}</h3>
              {description ? <p className="cardDesc">{description}</p> : null}

              {tags.length ? (
                <div className="pfTags" aria-label="Technologies">
                  {tags.slice(0, 10).map((t, tIdx) => (
                    <span key={`${t}-${tIdx}`} className="tag">{t}</span>
                  ))}
                </div>
              ) : null}

              {(github || live) ? (
                <div className="cardActions">
                  {github ? (
                    <a className="link" href={github} target="_blank" rel="noreferrer">GitHub</a>
                  ) : null}
                  {live ? (
                    <a className="link" href={live} target="_blank" rel="noreferrer">Live</a>
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
