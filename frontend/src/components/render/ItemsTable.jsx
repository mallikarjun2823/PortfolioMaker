import React, { useMemo } from 'react'

import Value from './Value.jsx'

function unionKeys(items) {
  const keys = new Set()
  for (const row of items || []) {
    if (!row || typeof row !== 'object') continue
    for (const k of Object.keys(row)) keys.add(k)
  }
  return Array.from(keys)
}

export default function ItemsTable({ items }) {
  const rows = Array.isArray(items) ? items : []
  const columns = useMemo(() => unionKeys(rows), [rows])

  if (rows.length === 0) {
    return <div className="subtle">No items.</div>
  }

  return (
    <div className="tableWrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={c}>
                  <Value value={row ? row[c] : null} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
