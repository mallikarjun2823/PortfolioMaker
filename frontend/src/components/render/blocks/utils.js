import { resolveAssetUrl } from '../../../api/client.js'

export function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function getObjectValue(obj, key) {
  if (!isObject(obj)) return undefined

  const rawKey = String(key || '')
  if (!rawKey) return undefined

  if (rawKey in obj) return obj[rawKey]

  const keyLower = rawKey.toLowerCase()
  for (const [k, v] of Object.entries(obj)) {
    if (String(k).toLowerCase() === keyLower) return v
  }

  const keyNorm = normalizeKey(rawKey)
  if (!keyNorm) return undefined
  for (const [k, v] of Object.entries(obj)) {
    if (normalizeKey(k) === keyNorm) return v
  }

  return undefined
}

export function looksLikeUrl(value) {
  if (typeof value !== 'string') return false
  const v = value.trim().toLowerCase()
  return v.startsWith('http://') || v.startsWith('https://')
}

export function looksLikeImageUrl(value) {
  if (typeof value !== 'string') return false
  const v = value.toLowerCase().trim()
  if (v.startsWith('http://') || v.startsWith('https://')) return /\.(png|jpg|jpeg|gif|webp|svg)(\?|#|$)/.test(v)
  if (v.startsWith('/media/') || v.startsWith('media/')) return true
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?|#|$)/.test(v)
}

export function stringifyValue(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(' • ')
  if (isObject(value)) {
    const compact = Object.entries(value)
      .slice(0, 6)
      .map(([k, v]) => `${k}: ${stringifyValue(v)}`)
      .filter(Boolean)
      .join(' • ')
    return compact
  }
  return String(value)
}

export function extractText(obj, keys) {
  if (!isObject(obj)) return null
  for (const k of keys) {
    const v = getObjectValue(obj, k)
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number') return String(v)
  }
  return null
}

export function extractArray(obj, keys) {
  if (!isObject(obj)) return []
  for (const k of keys) {
    const v = getObjectValue(obj, k)
    if (Array.isArray(v)) return v.map((x) => stringifyValue(x)).filter(Boolean)
    if (typeof v === 'string' && v.trim()) {
      return v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}

export function extractUrl(obj, keys, { github = false } = {}) {
  if (!isObject(obj)) return null
  for (const k of keys) {
    const v = getObjectValue(obj, k)
    if (typeof v !== 'string') continue
    const raw = v.trim()
    if (!raw) continue
    if (looksLikeUrl(raw)) return raw

    if (raw.startsWith('/media/') || raw.startsWith('media/')) {
      return resolveAssetUrl(raw)
    }

    if (github) {
      if (raw.includes('github.com')) return raw.startsWith('http') ? raw : `https://${raw}`
      if (/^[\w.-]+\/[\w.-]+$/.test(raw)) return `https://github.com/${raw}`
    }
  }
  return null
}
