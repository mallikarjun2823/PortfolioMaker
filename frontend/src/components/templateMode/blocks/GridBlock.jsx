import React from 'react'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function valueToString(value) {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

function EmptyState({ message }) {
  return <div className="tmEmpty">{message}</div>
}

export default function GridBlock({ items, fields }) {
  const list = asArray(items)
  const visibleFields = asArray(fields)

  if (!list.length) {
    return <EmptyState message="No data available" />
  }

  const primaryField = visibleFields[0] || 'title'
  const secondaryField = visibleFields[1] || 'description'
  const actionField = visibleFields[2] || 'github_url'

  return (
    <div className="tmGrid">
      {list.map((item, index) => {
        const title = valueToString(item?.[primaryField]) || `Project ${index + 1}`
        const description = valueToString(item?.[secondaryField])
        const actionValue = valueToString(item?.[actionField])
        const isUrl = /^https?:\/\//i.test(actionValue)

        return (
          <article key={item?.id || `${title}-${index}`} className="tmProjectCard">
            <h3 className="tmProjectTitle">{title}</h3>
            {description ? <p className="tmProjectDescription">{description}</p> : null}
            {actionValue ? (
              isUrl ? (
                <a className="tmProjectLink" href={actionValue} target="_blank" rel="noreferrer">
                  View Project
                </a>
              ) : (
                <div className="tmProjectMeta">{actionValue}</div>
              )
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
