import React from 'react'

function formatSource(value) {
  return String(value || '').toUpperCase()
}

export default function ElementRow({
  element,
  canMoveUp,
  canMoveDown,
  onToggleVisible,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown
}) {
  if (!element) return null

  const label = element.label || 'Untitled'
  const source = formatSource(element.data_source)
  const field = String(element.field || '')
  const visible = !!element.is_visible

  return (
    <div className={`elementRow ${visible ? '' : 'elementRowHidden'}`.trim()}>
      <div className="elementCell elementLabel" title={label}>
        {label}
      </div>

      <div className="elementCell elementSource" title={source}>
        {source}
      </div>

      <div className="elementCell elementField" title={field}>
        <span className="elementFieldChip">{field || '—'}</span>
      </div>

      <div className="elementActions" aria-label="Element actions">
        <button
          type="button"
          className="iconBtn"
          onClick={onToggleVisible}
          title={visible ? 'Hide element' : 'Show element'}
        >
          {visible ? '👁' : '🚫'}
        </button>

        <button type="button" className="iconBtn" onClick={onEdit} title="Edit">
          ⚙
        </button>

        <button type="button" className="iconBtn" onClick={onDelete} title="Delete">
          🗑
        </button>

        <div className="elementMove">
          <button
            type="button"
            className="iconBtn"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="iconBtn"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="Move down"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  )
}
