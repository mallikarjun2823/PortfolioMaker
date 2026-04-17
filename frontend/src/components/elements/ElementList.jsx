import React from 'react'

import ElementRow from './ElementRow.jsx'

export default function ElementList({ elements, loading, onAdd, onToggleVisible, onEdit, onDelete, onMove }) {
  const list = Array.isArray(elements) ? elements : []

  return (
    <div className="elementPanel">
      <div className="elementPanelHeader">
        <div>
          <div className="elementPanelTitle">Elements</div>
          <div className="elementPanelSubtitle">Map backend data → UI fields</div>
        </div>

        <button type="button" className="btn" onClick={onAdd}>
          + Add Element
        </button>
      </div>

      <div className="elementGridHeader" aria-hidden="true">
        <div className="elementHeaderCell">Label</div>
        <div className="elementHeaderCell">Source</div>
        <div className="elementHeaderCell">Field</div>
        <div className="elementHeaderCell" style={{ textAlign: 'right' }}>Actions</div>
      </div>

      {loading ? (
        <div className="elementEmpty">Loading elements…</div>
      ) : list.length === 0 ? (
        <div className="elementEmpty">No elements yet. Add one to start mapping.</div>
      ) : (
        <div className="elementList">
          {list
            .slice()
            .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
            .map((el, idx) => (
              <ElementRow
                key={el.id || idx}
                element={el}
                canMoveUp={idx > 0}
                canMoveDown={idx < list.length - 1}
                onToggleVisible={() => onToggleVisible?.(el)}
                onEdit={() => onEdit?.(el)}
                onDelete={() => onDelete?.(el)}
                onMoveUp={() => onMove?.(el, -1)}
                onMoveDown={() => onMove?.(el, +1)}
              />
            ))}
        </div>
      )}
    </div>
  )
}
