function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function toTemplateData(overview) {
  const experience = Array.isArray(overview?.experience)
    ? overview.experience
    : asArray(overview?.experiences)

  return {
    PORTFOLIO: asObject(overview?.portfolio),
    PROJECT: asArray(overview?.projects),
    SKILL: asArray(overview?.skills),
    EXPERIENCE: experience,
  }
}
