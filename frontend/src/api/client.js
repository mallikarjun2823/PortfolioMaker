const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').trim()
const TOKEN_STORAGE_KEY = 'pm_jwt'

let unauthorizedHandler = null

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function getApiBase() {
  return API_BASE.replace(/\/+$/, '') || '/api'
}

function getApiOrigin() {
  const base = getApiBase()
  if (/^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin
    } catch {
      return window.location.origin
    }
  }
  return window.location.origin
}

function buildUrl(path) {
  const raw = String(path || '').trim()
  if (/^https?:\/\//i.test(raw)) return raw
  const normalized = raw.startsWith('/') ? raw : `/${raw}`
  return `${getApiBase()}${normalized}`
}

function extractMessage(status, data) {
  const detail = data?.detail || data?.message || data?.error
  if (typeof detail === 'string' && detail.trim()) return detail.trim()

  if (status === 401) return 'Your session expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status >= 500) return 'Something went wrong on the server. Please try again.'

  return `Request failed (${status}).`
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
}

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token) {
  if (!token) return
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function isAuthenticated() {
  return Boolean(getToken())
}

export function resolveAssetUrl(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `${getApiOrigin()}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const requestHeaders = { ...headers }

  if (auth) {
    const token = getToken()
    if (token) requestHeaders.Authorization = `Bearer ${token}`
  }

  let payload = undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    body: payload
  })

  const data = await parseResponse(response)

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler()
    throw new ApiError(extractMessage(response.status, data), response.status, data)
  }

  return data
}

export const api = {
  login: (payload) => apiRequest('/auth/login/', { method: 'POST', body: payload, auth: false }),

  listPortfolios: () => apiRequest('/portfolios/'),
  createPortfolio: (payload) => apiRequest('/portfolios/', { method: 'POST', body: payload }),
  getPortfolio: (portfolioId) => apiRequest(`/portfolios/${portfolioId}/`),
  updatePortfolio: (portfolioId, payload) => apiRequest(`/portfolios/${portfolioId}/`, { method: 'PATCH', body: payload }),
  deletePortfolio: (portfolioId) => apiRequest(`/portfolios/${portfolioId}/`, { method: 'DELETE' }),

  listSections: (portfolioId) => apiRequest(`/portfolios/${portfolioId}/sections/`),
  createSection: (portfolioId, payload) => apiRequest(`/portfolios/${portfolioId}/sections/`, { method: 'POST', body: payload }),
  updateSection: (portfolioId, sectionId, payload) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/`, { method: 'PATCH', body: payload }),
  deleteSection: (portfolioId, sectionId) => apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/`, { method: 'DELETE' }),

  listBlocks: (portfolioId, sectionId) => apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/`),
  createBlock: (portfolioId, sectionId, payload) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/`, { method: 'POST', body: payload }),
  updateBlock: (portfolioId, sectionId, blockId, payload) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/`, { method: 'PATCH', body: payload }),
  deleteBlock: (portfolioId, sectionId, blockId) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/`, { method: 'DELETE' }),

  listElements: (portfolioId, sectionId, blockId) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/`),
  createElement: (portfolioId, sectionId, blockId, payload) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/`, {
      method: 'POST',
      body: payload
    }),
  updateElement: (portfolioId, sectionId, blockId, elementId, payload) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/${elementId}/`, {
      method: 'PATCH',
      body: payload
    }),
  deleteElement: (portfolioId, sectionId, blockId, elementId) =>
    apiRequest(`/portfolios/${portfolioId}/sections/${sectionId}/blocks/${blockId}/elements/${elementId}/`, {
      method: 'DELETE'
    }),

  getPublicPortfolio: (slug) => apiRequest(`/public/portfolios/${slug}/render/`, { auth: false })
}
