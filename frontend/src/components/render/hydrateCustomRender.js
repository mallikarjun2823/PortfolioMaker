function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function isVisibleRow(row) {
  return row?.is_visible !== false
}

function normalizeSource(value) {
  return String(value || '').trim().toUpperCase()
}

function getFieldValue(record, key) {
  if (!record || typeof record !== 'object') return undefined

  const rawKey = String(key || '').trim()
  if (!rawKey) return undefined

  if (rawKey in record) return record[rawKey]

  const lower = rawKey.toLowerCase()
  for (const [k, v] of Object.entries(record)) {
    if (String(k).toLowerCase() === lower) return v
  }

  if (rawKey.includes('.')) {
    const parts = rawKey.split('.').map((p) => p.trim()).filter(Boolean)
    let current = record
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined
      if (part in current) {
        current = current[part]
        continue
      }
      const partLower = part.toLowerCase()
      const hit = Object.entries(current).find(([k]) => String(k).toLowerCase() === partLower)
      if (!hit) return undefined
      current = hit[1]
    }
    return current
  }

  return undefined
}

function textValue(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function compareEq(a, b) {
  const aa = textValue(a).trim().toLowerCase()
  const bb = textValue(b).trim().toLowerCase()
  return aa === bb
}

function compareIn(a, list) {
  const items = asArray(list)
  return items.some((item) => compareEq(a, item))
}

function compareContains(a, b) {
  const aa = textValue(a).trim().toLowerCase()
  const bb = textValue(b).trim().toLowerCase()
  if (!aa || !bb) return false
  return aa.includes(bb)
}

function compareStartsWith(a, b) {
  const aa = textValue(a).trim().toLowerCase()
  const bb = textValue(b).trim().toLowerCase()
  if (!aa || !bb) return false
  return aa.startsWith(bb)
}

function compareEndsWith(a, b) {
  const aa = textValue(a).trim().toLowerCase()
  const bb = textValue(b).trim().toLowerCase()
  if (!aa || !bb) return false
  return aa.endsWith(bb)
}

function numberValue(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function applyFilterOperator(operator, rowValue, filterValue) {
  const op = String(operator || 'eq').trim().toLowerCase()

  if (op === 'eq') return compareEq(rowValue, filterValue)
  if (op === 'neq') return !compareEq(rowValue, filterValue)
  if (op === 'in') return compareIn(rowValue, filterValue)
  if (op === 'contains' || op === 'icontains') return compareContains(rowValue, filterValue)
  if (op === 'startswith') return compareStartsWith(rowValue, filterValue)
  if (op === 'endswith') return compareEndsWith(rowValue, filterValue)
  if (op === 'isnull') return (rowValue == null) === Boolean(filterValue)

  if (op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') {
    const left = numberValue(rowValue)
    const right = numberValue(filterValue)
    if (left == null || right == null) return false
    if (op === 'gt') return left > right
    if (op === 'gte') return left >= right
    if (op === 'lt') return left < right
    if (op === 'lte') return left <= right
  }

  return true
}

function applyFilters(rows, filters) {
  const items = asArray(rows)
  const normalizedFilters = asArray(filters).filter((f) => f && typeof f === 'object')
  if (normalizedFilters.length === 0) return items

  return items.filter((row) => {
    return normalizedFilters.every((filterItem) => {
      const key = String(filterItem.key || '').trim()
      if (!key) return true
      const value = getFieldValue(row, key)
      return applyFilterOperator(filterItem.operator, value, filterItem.value)
    })
  })
}

function buildDataBySource(customPayload, overviewPayload) {
  const overview = asObject(overviewPayload) || {}
  const portfolio = asObject(overview.portfolio) || {
    id: customPayload?.id,
    title: customPayload?.title,
    slug: customPayload?.slug,
    description: customPayload?.description,
    theme: customPayload?.theme,
  }

  const projects = asArray(overview.projects).filter(isVisibleRow)
  const skills = asArray(overview.skills).filter(isVisibleRow)
  const experience = asArray(overview.experience ?? overview.experiences).filter(isVisibleRow)

  return {
    PORTFOLIO: [portfolio],
    PROJECT: projects,
    SKILL: skills,
    EXPERIENCE: experience,
  }
}

function resolveBlockItems(block, dataBySource) {
  const elements = asArray(block?.elements)
  if (!elements.length) return []

  const elementRows = elements.map((element) => {
    const source = normalizeSource(element?.data_source)
    const baseRows = asArray(dataBySource[source])
    const config = asObject(element?.config) || {}
    const filters = asArray(config.filters)
    const rows = applyFilters(baseRows, filters)

    return {
      element,
      rows,
    }
  })

  const maxRows = elementRows.reduce((max, item) => Math.max(max, item.rows.length), 0)
  if (maxRows === 0) return []

  const items = []
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const row = {}

    for (const item of elementRows) {
      const element = item.element
      const label = String(element?.label || '').trim() || `${normalizeSource(element?.data_source)}.${element?.field || ''}`
      const record = item.rows[rowIndex]
      const value = record ? getFieldValue(record, element?.field) : null
      row[label] = value == null ? null : value
    }

    items.push(row)
  }

  return items
}

export function hydrateCustomRenderPayload(customPayload, overviewPayload) {
  const payload = asObject(customPayload)
  if (!payload) return customPayload

  const sections = asArray(payload.sections)
  if (!sections.length) return customPayload

  const dataBySource = buildDataBySource(payload, overviewPayload)

  const nextSections = sections.map((section) => {
    const blocks = asArray(section?.blocks)
    const nextBlocks = blocks.map((block) => ({
      ...block,
      items: resolveBlockItems(block, dataBySource),
    }))

    return {
      ...section,
      blocks: nextBlocks,
    }
  })

  return {
    ...payload,
    sections: nextSections,
  }
}
