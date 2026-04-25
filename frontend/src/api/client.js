const API_BASE = import.meta.env.VITE_API_BASE_URL
const DEFAULT_BASE_URL = '/api'
const TOKEN_STORAGE_KEY = 'pm_jwt'

function getBaseUrl() {
  const envUrl = (API_BASE && String(API_BASE).trim()) || ''
  return envUrl || DEFAULT_BASE_URL
}

function buildUrl(path) {
  const base = getBaseUrl().replace(/\/$/, '')
  const p = String(path || '').trim()
  if (!p.startsWith('/')) return `${base}/${p}`
  return `${base}${p}`
}

function getApiOrigin() {
  const base = getBaseUrl().trim()
  if (/^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin
    } catch {
      return window.location.origin
    }
  }
  return window.location.origin
}

function flattenErrorData(data) {
  if (!data) return ''

  if (typeof data === 'string') {
    const value = data.trim()
    return value
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const value = flattenErrorData(item)
      if (value) return value
    }
    return ''
  }

  if (typeof data === 'object') {
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim()
    if (typeof data.detail === 'string' && data.detail.trim()) return data.detail.trim()
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim()

    for (const [key, value] of Object.entries(data)) {
      const nested = flattenErrorData(value)
      if (!nested) continue
      return key === 'detail' ? nested : `${key}: ${nested}`
    }
  }

  return ''
}

export function resolveAssetUrl(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `${getApiOrigin()}${raw.startsWith('/') ? raw : `/${raw}`}`
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

function getErrorMessage(status, data) {
  const extracted = flattenErrorData(data)
  if (extracted) return extracted
  if (status === 401) return 'Please login again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status >= 500) return 'Server error. Please try again later.'
  return `Request failed (${status})`
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.response = { status, data }
  }
}

export async function apiRequest(path, { method = 'GET', token, body, headers } = {}) {
  const url = buildUrl(path)

  const finalHeaders = {
    ...(headers || {})
  }

  const effectiveToken = token || localStorage.getItem(TOKEN_STORAGE_KEY)
  if (effectiveToken) {
    finalHeaders.Authorization = `Bearer ${effectiveToken}`
  }

  let payload
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
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
    throw new ApiError(getErrorMessage(res.status, data), res.status, data)
  }

  return data
}

const listThemePresets = (token) => apiRequest('/themes/', { token })
const getPortfolioRender = (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/render/`, { token })
const getPublicPortfolioRenderBySlug = (slug) => apiRequest(`/public/portfolios/${slug}/render/`)
const getPublicPortfolioOverviewBySlug = (slug) => apiRequest(`/public/portfolios/${slug}/overview/`)
const getPortfolioOverview = (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/overview/`, { token })
const getPortfolioAnalytics = (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/analytics/`, { token })
const listTemplates = (token) => apiRequest('/templates/', { token })
const applyPortfolioTemplate = (token, portfolioId, templateId) =>
  apiRequest(`/portfolios/${portfolioId}/apply-template/`, {
    method: 'POST',
    token,
    body: { template_id: Number(templateId) }
  })
const importPortfolioFromResume = (token, portfolioId, payload) =>
  apiRequest(`/portfolios/${portfolioId}/import-resume/`, { method: 'POST', token, body: payload })
const getResumeUploadStatus = (token, uploadId) => apiRequest(`/resume-uploads/${uploadId}/status/`, { token })
const getPortfolioResumeDraft = (token, portfolioId) => apiRequest(`/portfolios/${portfolioId}/resume-draft/`, { token })
const applyPortfolioResumeDraft = (token, portfolioId, uploadId) =>
  apiRequest(`/portfolios/${portfolioId}/resume-drafts/${uploadId}/apply/`, { method: 'POST', token })

export const api = {
  // auth
  login: (payload) => apiRequest('/auth/login/', { method: 'POST', body: payload }),
  register: (payload) => apiRequest('/auth/register/', { method: 'POST', body: payload }),

  // themes
  listThemePresets,

  // portfolios
  listPortfolios: (token) => apiRequest('/portfolios/', { token }),
  createPortfolio: (token, payload) => apiRequest('/portfolios/', { method: 'POST', token, body: payload }),
  getPortfolio: (token, id) => apiRequest(`/portfolios/${id}/`, { token }),
  getPortfolioOverview,
  getPortfolioAnalytics,
  listTemplates,
  applyPortfolioTemplate,
  importPortfolioFromResume,
  getResumeUploadStatus,
  getPortfolioResumeDraft,
  applyPortfolioResumeDraft,
  updatePortfolio: (token, id, payload, { method = 'PATCH' } = {}) =>
    apiRequest(`/portfolios/${id}/`, { method, token, body: payload }),
  deletePortfolio: (token, id) => apiRequest(`/portfolios/${id}/`, { method: 'DELETE', token }),

  // render
  getPortfolioRender,
  getPublicPortfolioRenderBySlug,
  getPublicPortfolioOverviewBySlug,

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
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/${elementId}/`, { method: 'DELETE', token }),

  // backward-compatible aliases
  listThemes: listThemePresets,
  renderPortfolio: getPortfolioRender,
  renderPortfolioPublicBySlug: getPublicPortfolioRenderBySlug
}
