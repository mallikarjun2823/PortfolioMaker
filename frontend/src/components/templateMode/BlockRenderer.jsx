import React from 'react'

import GridBlock from './blocks/GridBlock.jsx'
import HeroBlock from './blocks/HeroBlock.jsx'
import ListBlock from './blocks/ListBlock.jsx'
import TimelineBlock from './blocks/TimelineBlock.jsx'

export default function BlockRenderer({ section, items }) {
  const type = String(section?.type || '').toUpperCase()

  switch (type) {
    case 'GRID':
      return <GridBlock items={items} fields={section?.fields} section={section} />

    case 'LIST':
      return <ListBlock items={items} fields={section?.fields} section={section} />

    case 'TIMELINE':
      return <TimelineBlock items={items} fields={section?.fields} section={section} />

    case 'HERO':
      return <HeroBlock item={items} section={section} />

    default:
      return null
  }
}
