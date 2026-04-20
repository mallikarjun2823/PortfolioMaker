export const MinimalTemplate = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean editorial layout with clear hierarchy and generous spacing.',
  sections: [
    {
      id: 'hero',
      type: 'HERO',
      data_source: 'PORTFOLIO',
    },
    {
      id: 'projects',
      type: 'GRID',
      data_source: 'PROJECT',
      fields: ['title', 'description', 'github_url'],
    },
    {
      id: 'experience',
      type: 'TIMELINE',
      data_source: 'EXPERIENCE',
      fields: ['company', 'role', 'timeline'],
    },
    {
      id: 'skills',
      type: 'LIST',
      data_source: 'SKILL',
      fields: ['name'],
    },
  ],
}

export const NeonGridTemplate = {
  id: 'neon-grid',
  name: 'Neon Grid',
  description: 'Bold hero, luminous project cards, and a high-contrast timeline.',
  sections: [
    {
      id: 'hero',
      type: 'HERO',
      data_source: 'PORTFOLIO',
      variant: 'neon',
    },
    {
      id: 'projects',
      type: 'GRID',
      data_source: 'PROJECT',
      fields: ['title', 'description', 'github_url'],
      columns: 2,
      variant: 'neon',
    },
    {
      id: 'skills',
      type: 'LIST',
      data_source: 'SKILL',
      fields: ['name'],
      style: 'pills',
    },
    {
      id: 'experience',
      type: 'TIMELINE',
      data_source: 'EXPERIENCE',
      fields: ['company', 'role', 'timeline'],
      variant: 'neon',
    },
  ],
}

export const MonochromeTemplate = {
  id: 'mono',
  name: 'Monochrome Brutal',
  description: 'Monochrome blocks, strong typography, and compact card rhythm.',
  sections: [
    {
      id: 'hero',
      type: 'HERO',
      data_source: 'PORTFOLIO',
      variant: 'mono',
    },
    {
      id: 'experience',
      type: 'TIMELINE',
      data_source: 'EXPERIENCE',
      fields: ['company', 'role', 'timeline'],
      variant: 'mono',
    },
    {
      id: 'projects',
      type: 'GRID',
      data_source: 'PROJECT',
      fields: ['title', 'description', 'github_url'],
      columns: 3,
      variant: 'mono',
    },
    {
      id: 'skills',
      type: 'LIST',
      data_source: 'SKILL',
      fields: ['name'],
      style: 'rows',
    },
  ],
}

export const TEMPLATE_REGISTRY = [MinimalTemplate, NeonGridTemplate, MonochromeTemplate]

export function getTemplateById(templateId) {
  const id = String(templateId || '').trim().toLowerCase()
  if (!id) return MinimalTemplate

  const match = TEMPLATE_REGISTRY.find((template) => String(template.id).toLowerCase() === id)
  return match || MinimalTemplate
}
