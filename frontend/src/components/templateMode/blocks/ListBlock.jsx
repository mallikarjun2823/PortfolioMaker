import React from 'react'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function EmptyState({ message }) {
  return <div className="tmEmpty">{message}</div>
}

export default function ListBlock({ items, fields, section }) {
  const list = asArray(items)
  const visibleFields = asArray(fields)
  const fieldName = visibleFields[0] || 'name'
  const style = String(section?.style || 'pills').toLowerCase()

  if (!list.length) {
    return <EmptyState message="No data available" />
  }

  if (style === 'rows') {
    return (
      <div className="tmListRows">
        {list.map((item, index) => {
          const value = item?.[fieldName]
          const text = typeof value === 'string' ? value : String(value ?? '')
          return <div key={item?.id || `${text}-${index}`} className="tmListRow">{text || `Skill ${index + 1}`}</div>
        })}
      </div>
    )
  }

  return (
    <div className="tmSkillPills">
      {list.map((item, index) => {
        const value = item?.[fieldName]
        const text = typeof value === 'string' ? value : String(value ?? '')
        return <span key={item?.id || `${text}-${index}`} className="tmSkillPill">{text || `Skill ${index + 1}`}</span>
      })}
    </div>
  )
}
