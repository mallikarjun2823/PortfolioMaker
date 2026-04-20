import React from 'react'

import SectionRenderer from './SectionRenderer.jsx'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

export default function TemplateRenderer({ template, data }) {
  const sections = asArray(template?.sections)

  if (!template || sections.length === 0) {
    return <div className="tmEmpty">Template is not configured.</div>
  }

  return (
    <div className="tmRoot">
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          data={data}
        />
      ))}
    </div>
  )
}
