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

export default function GridBlock({ items }) {
  const rows = asArray(items)
  if (rows.length === 0) return null

  const titleKeys = ['title', 'name', 'project', 'project name', 'project_name', 'heading']
  const descriptionKeys = ['description', 'summary', 'details', 'about']
  const githubKeys = ['github', 'github url', 'github_url', 'repository', 'repo', 'repo_url']
  const liveKeys = ['url', 'link', 'live', 'live url', 'live_url', 'website']
  const tagKeys = ['tags', 'tech', 'stack', 'skills', 'technologies']
  const imageKeys = ['image', 'image_url', 'cover', 'thumbnail', 'preview']

  const projects = rows
    .map((raw) => (isObject(raw) ? raw : { title: stringifyValue(raw) }))
    .filter((item) => {
      const rawTitle = extractText(item, titleKeys)
      const rawDesc = extractText(item, descriptionKeys)
      const rawGithub = extractUrl(item, githubKeys, { github: true })
      const rawLive = extractUrl(item, liveKeys)
      const rawImage = extractUrl(item, imageKeys)
      return Boolean(rawTitle || rawDesc || rawGithub || rawLive || rawImage)
    })

  if (projects.length === 0) return null

  return (
    <div className="pfGrid">
      {projects.map((item, idx) => {
        const title = extractText(item, titleKeys) || `Project ${idx + 1}`
        const description = extractText(item, descriptionKeys)
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
