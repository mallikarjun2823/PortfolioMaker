const DEFAULT_BASE_URL = '/api'

function getBaseUrl() {
  const envUrl = import.meta?.env?.VITE_API_BASE_URL
  return (envUrl && String(envUrl).trim()) || DEFAULT_BASE_URL
}

function buildUrl(path) {
  const base = getBaseUrl().replace(/\/$/, '')
  const p = String(path || '').trim()
  if (!p.startsWith('/')) return `${base}/${p}`
  return `${base}${p}`
}

async function parseJsonSafe(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function apiRequest(path, { method = 'GET', token, body, headers } = {}) {
  const url = buildUrl(path)

  const finalHeaders = {
    ...(headers || {})
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`
  }

  let payload
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: payload
  })

  const data = await parseJsonSafe(res)

  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Request failed (${res.status})`
    throw new ApiError(msg, res.status, data)
  }

  return data
}

export const api = {
  // auth
  login: (payload) => apiRequest('/auth/login/', { method: 'POST', body: payload }),
  register: (payload) => apiRequest('/auth/register/', { method: 'POST', body: payload }),

  // portfolios
  listPortfolios: (token) => apiRequest('/portfolios/', { token }),
  createPortfolio: (token, payload) => apiRequest('/portfolios/', { method: 'POST', token, body: payload }),
  getPortfolio: (token, id) => apiRequest(`/portfolios/${id}/`, { token }),
  updatePortfolio: (token, id, payload, { method = 'PATCH' } = {}) =>
    apiRequest(`/portfolios/${id}/`, { method, token, body: payload }),
  deletePortfolio: (token, id) => apiRequest(`/portfolios/${id}/`, { method: 'DELETE', token }),

  // render
  renderPortfolio: (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/render/`, { token }),

  // children
  listProjects: (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/projects/`, { token }),
  createProject: (token, portfolioId, payload) => apiRequest(`/portfolios/${portfolioId}/projects/`, { method: 'POST', token, body: payload }),
  updateProject: (token, portfolioId, projectId, payload, { method = 'PATCH' } = {}) =>
    apiRequest(`/portfolios/${portfolioId}/projects/${projectId}/`, { method, token, body: payload }),
  deleteProject: (token, portfolioId, projectId) => apiRequest(`/portfolios/${portfolioId}/projects/${projectId}/`, { method: 'DELETE', token }),

  listSkills: (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/skills/`, { token }),
  createSkill: (token, portfolioId, payload) => apiRequest(`/portfolios/${portfolioId}/skills/`, { method: 'POST', token, body: payload }),
  updateSkill: (token, portfolioId, skillId, payload, { method = 'PATCH' } = {}) =>
    apiRequest(`/portfolios/${portfolioId}/skills/${skillId}/`, { method, token, body: payload }),
  deleteSkill: (token, portfolioId, skillId) => apiRequest(`/portfolios/${portfolioId}/skills/${skillId}/`, { method: 'DELETE', token }),

  listExperiences: (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/experiences/`, { token }),
  createExperience: (token, portfolioId, payload) => apiRequest(`/portfolios/${portfolioId}/experiences/`, { method: 'POST', token, body: payload }),
  updateExperience: (token, portfolioId, experienceId, payload, { method = 'PATCH' } = {}) =>
    apiRequest(`/portfolios/${portfolioId}/experiences/${experienceId}/`, { method, token, body: payload }),
  deleteExperience: (token, portfolioId, experienceId) => apiRequest(`/portfolios/${portfolioId}/experiences/${experienceId}/`, { method: 'DELETE', token }),

  listSections: (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/sections/`, { token }),
  createSection: (token, portfolioId, payload) => apiRequest(`/portfolios/${portfolioId}/sections/`, { method: 'POST', token, body: payload }),
  updateSection: (token, portfolioId, sectionId, payload, { method = 'PATCH' } = {}) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/`, { method, token, body: payload }),
  deleteSection: (token, portfolioId, sectionId) => apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/`, { method: 'DELETE', token }),

  // blocks (under sections)
  listBlocks: (token, portfolioId, sectionId) => apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/`, { token }),
  createBlock: (token, portfolioId, sectionId, payload) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/`, { method: 'POST', token, body: payload }),
  updateBlock: (token, portfolioId, sectionId, blockId, payload, { method = 'PATCH' } = {}) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/`, { method, token, body: payload }),
  deleteBlock: (token, portfolioId, sectionId, blockId) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/`, { method: 'DELETE', token }),

  // elements (under blocks)
  listElements: (token, portfolioId, sectionId, blockId) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/`, { token }),
  createElement: (token, portfolioId, sectionId, blockId, payload) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/`, { method: 'POST', token, body: payload }),
  updateElement: (token, portfolioId, sectionId, blockId, elementId, payload, { method = 'PATCH' } = {}) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/${elementId}/`, { method, token, body: payload }),
  deleteElement: (token, portfolioId, sectionId, blockId, elementId) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/${elementId}/`, { method: 'DELETE', token })
}
