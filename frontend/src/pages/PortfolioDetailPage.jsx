import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../api/client.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorState from '../components/ErrorState.jsx'
import Loader from '../components/Loader.jsx'

const BLOCK_TYPES = ['LIST', 'GRID', 'TIMELINE', 'KEY_VALUE', 'IMAGE']

const FIELDS_BY_SOURCE = {
  PROJECT: ['title', 'description', 'github_url', 'image'],
  SKILL: ['name', 'level'],
  EXPERIENCE: ['company', 'role', 'timeline'],
  PORTFOLIO: ['title', 'description', 'resume']
}

function toNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function PortfolioDetailPage() {
  const { portfolioId } = useParams()

  const [portfolio, setPortfolio] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [newSectionName, setNewSectionName] = useState('')
  const [newBlockDrafts, setNewBlockDrafts] = useState({})
  const [newElementDrafts, setNewElementDrafts] = useState({})

  const [sectionDrafts, setSectionDrafts] = useState({})
  const [blockDrafts, setBlockDrafts] = useState({})
  const [elementDrafts, setElementDrafts] = useState({})

  const sectionCount = sections.length

  async function loadPortfolioGraph() {
    setLoading(true)
    setError(null)

    try {
      const [portfolioResponse, sectionResponse] = await Promise.all([
        api.getPortfolio(portfolioId),
        api.listSections(portfolioId)
      ])

      const sectionList = Array.isArray(sectionResponse) ? sectionResponse : []

      const nestedSections = await Promise.all(
        sectionList.map(async (section) => {
          const blockResponse = await api.listBlocks(portfolioId, section.id)
          const blockList = Array.isArray(blockResponse) ? blockResponse : []

          const nestedBlocks = await Promise.all(
            blockList.map(async (block) => {
              const elementResponse = await api.listElements(portfolioId, section.id, block.id)
              const elementList = Array.isArray(elementResponse) ? elementResponse : []
              return { ...block, elements: elementList }
            })
          )

          return { ...section, blocks: nestedBlocks }
        })
      )

      const nextSectionDrafts = {}
      const nextBlockDrafts = {}
      const nextElementDrafts = {}

      nestedSections.forEach((section) => {
        nextSectionDrafts[section.id] = {
          name: section.name || '',
          order: String(section.order ?? ''),
          is_visible: Boolean(section.is_visible)
        }

        section.blocks.forEach((block) => {
          nextBlockDrafts[block.id] = {
            type: String(block.type || 'LIST').toUpperCase(),
            order: String(block.order ?? ''),
            is_visible: Boolean(block.is_visible)
          }

          block.elements.forEach((element) => {
            nextElementDrafts[element.id] = {
              label: element.label || '',
              data_source: String(element.data_source || 'PROJECT').toUpperCase(),
              field: String(element.field || 'title'),
              order: String(element.order ?? ''),
              is_visible: Boolean(element.is_visible)
            }
          })
        })
      })

      setPortfolio(portfolioResponse || null)
      setSections(nestedSections)
      setSectionDrafts(nextSectionDrafts)
      setBlockDrafts(nextBlockDrafts)
      setElementDrafts(nextElementDrafts)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPortfolioGraph()
  }, [portfolioId])

  async function runMutation(action) {
    setBusy(true)
    setError(null)

    try {
      await action()
      await loadPortfolioGraph()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function createSection(event) {
    event.preventDefault()
    const name = newSectionName.trim()
    if (!name) return

    await runMutation(() =>
      api.createSection(portfolioId, {
        name,
        order: sectionCount + 1,
        is_visible: true,
        config: {}
      })
    )

    setNewSectionName('')
  }

  async function saveSection(section) {
    const draft = sectionDrafts[section.id]
    if (!draft) return

    await runMutation(() =>
      api.updateSection(portfolioId, section.id, {
        name: draft.name.trim(),
        order: toNumber(draft.order, section.order || 1),
        is_visible: Boolean(draft.is_visible)
      })
    )
  }

  async function removeSection(section) {
    const confirmed = window.confirm('Delete this section and all nested blocks/elements?')
    if (!confirmed) return
    await runMutation(() => api.deleteSection(portfolioId, section.id))
  }

  function getBlockDraft(sectionId) {
    return newBlockDrafts[sectionId] || { type: 'LIST' }
  }

  function setBlockDraft(sectionId, nextDraft) {
    setNewBlockDrafts((current) => ({
      ...current,
      [sectionId]: {
        ...getBlockDraft(sectionId),
        ...nextDraft
      }
    }))
  }

  async function createBlock(section) {
    const draft = getBlockDraft(section.id)

    await runMutation(() =>
      api.createBlock(portfolioId, section.id, {
        type: draft.type,
        order: section.blocks.length + 1,
        is_visible: true,
        config: {}
      })
    )
  }

  async function saveBlock(section, block) {
    const draft = blockDrafts[block.id]
    if (!draft) return

    await runMutation(() =>
      api.updateBlock(portfolioId, section.id, block.id, {
        type: draft.type,
        order: toNumber(draft.order, block.order || 1),
        is_visible: Boolean(draft.is_visible)
      })
    )
  }

  async function removeBlock(section, block) {
    const confirmed = window.confirm('Delete this block and all nested elements?')
    if (!confirmed) return
    await runMutation(() => api.deleteBlock(portfolioId, section.id, block.id))
  }

  function getElementDraft(blockId) {
    return newElementDrafts[blockId] || {
      label: '',
      data_source: 'PROJECT',
      field: 'title'
    }
  }

  function setElementDraft(blockId, nextDraft) {
    const current = getElementDraft(blockId)
    const merged = { ...current, ...nextDraft }

    if (nextDraft.data_source && !FIELDS_BY_SOURCE[nextDraft.data_source]?.includes(merged.field)) {
      merged.field = FIELDS_BY_SOURCE[nextDraft.data_source][0]
    }

    setNewElementDrafts((state) => ({
      ...state,
      [blockId]: merged
    }))
  }

  async function createElement(section, block) {
    const draft = getElementDraft(block.id)
    const label = draft.label.trim()
    if (!label) return

    await runMutation(() =>
      api.createElement(portfolioId, section.id, block.id, {
        label,
        data_source: draft.data_source,
        field: draft.field,
        order: block.elements.length + 1,
        is_visible: true,
        config: {}
      })
    )

    setNewElementDrafts((state) => ({
      ...state,
      [block.id]: {
        label: '',
        data_source: draft.data_source,
        field: FIELDS_BY_SOURCE[draft.data_source][0]
      }
    }))
  }

  async function saveElement(section, block, element) {
    const draft = elementDrafts[element.id]
    if (!draft) return

    await runMutation(() =>
      api.updateElement(portfolioId, section.id, block.id, element.id, {
        label: draft.label.trim(),
        data_source: draft.data_source,
        field: draft.field,
        order: toNumber(draft.order, element.order || 1),
        is_visible: Boolean(draft.is_visible)
      })
    )
  }

  async function removeElement(section, block, element) {
    const confirmed = window.confirm('Delete this element?')
    if (!confirmed) return
    await runMutation(() => api.deleteElement(portfolioId, section.id, block.id, element.id))
  }

  const heading = useMemo(() => {
    if (!portfolio) return 'Portfolio Builder'
    return `${portfolio.title} Builder`
  }, [portfolio])

  return (
    <section className="pm-pageStack">
      <div className="pm-pageHeading pm-rowWrap">
        <div>
          <h1>{heading}</h1>
          <p>Sections, blocks, and elements are fully backend-driven.</p>
        </div>

        <Link className="pm-btn pm-btnSecondary" to="/app/portfolios">
          Back to portfolios
        </Link>
      </div>

      <ErrorState error={error} onRetry={loadPortfolioGraph} />

      {loading ? <Loader label="Loading portfolio structure..." /> : null}

      {!loading && !portfolio ? (
        <EmptyState title="Portfolio not found" message="This record may not exist or you might not have access." />
      ) : null}

      {!loading && portfolio ? (
        <form className="pm-card pm-formGrid" onSubmit={createSection}>
          <div className="pm-field">
            <label htmlFor="new-section-name">Create section</label>
            <input
              id="new-section-name"
              className="pm-input"
              value={newSectionName}
              onChange={(event) => setNewSectionName(event.target.value)}
              placeholder="About"
            />
          </div>

          <div className="pm-formActions">
            <button type="submit" className="pm-btn" disabled={busy || !newSectionName.trim()}>
              Add section
            </button>
          </div>
        </form>
      ) : null}

      {!loading && portfolio && sections.length === 0 ? (
        <EmptyState title="No sections yet" message="Create a section to start composing your portfolio." />
      ) : null}

      {!loading && sections.length > 0 ? (
        <div className="pm-pageStack">
          {sections.map((section) => {
            const sectionDraft = sectionDrafts[section.id]

            return (
              <article key={section.id} className="pm-card pm-cardStack">
                <div className="pm-cardHeader">
                  <h2>Section #{section.order}</h2>
                  <div className="pm-row">
                    <button
                      type="button"
                      className="pm-btn pm-btnSecondary"
                      onClick={() => saveSection(section)}
                      disabled={busy || !sectionDraft?.name?.trim()}
                    >
                      Save section
                    </button>
                    <button
                      type="button"
                      className="pm-btn pm-btnDanger"
                      onClick={() => removeSection(section)}
                      disabled={busy}
                    >
                      Delete section
                    </button>
                  </div>
                </div>

                <div className="pm-inlineGrid pm-threeCols">
                  <div className="pm-field">
                    <label>Name</label>
                    <input
                      className="pm-input"
                      value={sectionDraft?.name || ''}
                      onChange={(event) =>
                        setSectionDrafts((state) => ({
                          ...state,
                          [section.id]: {
                            ...state[section.id],
                            name: event.target.value
                          }
                        }))
                      }
                    />
                  </div>

                  <div className="pm-field">
                    <label>Order</label>
                    <input
                      className="pm-input"
                      value={sectionDraft?.order || ''}
                      onChange={(event) =>
                        setSectionDrafts((state) => ({
                          ...state,
                          [section.id]: {
                            ...state[section.id],
                            order: event.target.value
                          }
                        }))
                      }
                    />
                  </div>

                  <label className="pm-check">
                    <input
                      type="checkbox"
                      checked={Boolean(sectionDraft?.is_visible)}
                      onChange={(event) =>
                        setSectionDrafts((state) => ({
                          ...state,
                          [section.id]: {
                            ...state[section.id],
                            is_visible: event.target.checked
                          }
                        }))
                      }
                    />
                    Visible
                  </label>
                </div>

                <div className="pm-subSection">
                  <div className="pm-cardHeader">
                    <h3>Blocks</h3>
                  </div>

                  <div className="pm-inlineGrid pm-twoCols">
                    <div className="pm-field">
                      <label>Block type</label>
                      <select
                        className="pm-input"
                        value={getBlockDraft(section.id).type}
                        onChange={(event) => setBlockDraft(section.id, { type: event.target.value })}
                      >
                        {BLOCK_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pm-formActions">
                      <button type="button" className="pm-btn" onClick={() => createBlock(section)} disabled={busy}>
                        Add block
                      </button>
                    </div>
                  </div>

                  {section.blocks.length === 0 ? (
                    <EmptyState title="No blocks" message="Add a block to define how this section renders." />
                  ) : null}

                  {section.blocks.map((block) => {
                    const blockDraft = blockDrafts[block.id]

                    return (
                      <div key={block.id} className="pm-nestedCard">
                        <div className="pm-cardHeader">
                          <h4>Block #{block.order}</h4>
                          <div className="pm-row">
                            <button
                              type="button"
                              className="pm-btn pm-btnSecondary"
                              onClick={() => saveBlock(section, block)}
                              disabled={busy}
                            >
                              Save block
                            </button>
                            <button
                              type="button"
                              className="pm-btn pm-btnDanger"
                              onClick={() => removeBlock(section, block)}
                              disabled={busy}
                            >
                              Delete block
                            </button>
                          </div>
                        </div>

                        <div className="pm-inlineGrid pm-threeCols">
                          <div className="pm-field">
                            <label>Type</label>
                            <select
                              className="pm-input"
                              value={blockDraft?.type || 'LIST'}
                              onChange={(event) =>
                                setBlockDrafts((state) => ({
                                  ...state,
                                  [block.id]: {
                                    ...state[block.id],
                                    type: event.target.value
                                  }
                                }))
                              }
                            >
                              {BLOCK_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="pm-field">
                            <label>Order</label>
                            <input
                              className="pm-input"
                              value={blockDraft?.order || ''}
                              onChange={(event) =>
                                setBlockDrafts((state) => ({
                                  ...state,
                                  [block.id]: {
                                    ...state[block.id],
                                    order: event.target.value
                                  }
                                }))
                              }
                            />
                          </div>

                          <label className="pm-check">
                            <input
                              type="checkbox"
                              checked={Boolean(blockDraft?.is_visible)}
                              onChange={(event) =>
                                setBlockDrafts((state) => ({
                                  ...state,
                                  [block.id]: {
                                    ...state[block.id],
                                    is_visible: event.target.checked
                                  }
                                }))
                              }
                            />
                            Visible
                          </label>
                        </div>

                        <div className="pm-subSection">
                          <div className="pm-cardHeader">
                            <h5>Elements</h5>
                          </div>

                          <div className="pm-inlineGrid pm-fourCols">
                            <div className="pm-field">
                              <label>Label</label>
                              <input
                                className="pm-input"
                                value={getElementDraft(block.id).label}
                                onChange={(event) => setElementDraft(block.id, { label: event.target.value })}
                                placeholder="Project title"
                              />
                            </div>

                            <div className="pm-field">
                              <label>Data source</label>
                              <select
                                className="pm-input"
                                value={getElementDraft(block.id).data_source}
                                onChange={(event) => setElementDraft(block.id, { data_source: event.target.value })}
                              >
                                {Object.keys(FIELDS_BY_SOURCE).map((source) => (
                                  <option key={source} value={source}>
                                    {source}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="pm-field">
                              <label>Field</label>
                              <select
                                className="pm-input"
                                value={getElementDraft(block.id).field}
                                onChange={(event) => setElementDraft(block.id, { field: event.target.value })}
                              >
                                {FIELDS_BY_SOURCE[getElementDraft(block.id).data_source].map((field) => (
                                  <option key={field} value={field}>
                                    {field}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="pm-formActions">
                              <button
                                type="button"
                                className="pm-btn"
                                onClick={() => createElement(section, block)}
                                disabled={busy || !getElementDraft(block.id).label.trim()}
                              >
                                Add element
                              </button>
                            </div>
                          </div>

                          {block.elements.length === 0 ? (
                            <EmptyState title="No elements" message="Create an element to map backend fields into this block." />
                          ) : null}

                          {block.elements.length > 0 ? (
                            <div className="pm-tableWrap">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Label</th>
                                    <th>Source</th>
                                    <th>Field</th>
                                    <th>Order</th>
                                    <th>Visible</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {block.elements.map((element) => {
                                    const elementDraft = elementDrafts[element.id]
                                    const elementSource = elementDraft?.data_source || 'PROJECT'

                                    return (
                                      <tr key={element.id}>
                                        <td>
                                          <input
                                            className="pm-input"
                                            value={elementDraft?.label || ''}
                                            onChange={(event) =>
                                              setElementDrafts((state) => ({
                                                ...state,
                                                [element.id]: {
                                                  ...state[element.id],
                                                  label: event.target.value
                                                }
                                              }))
                                            }
                                          />
                                        </td>

                                        <td>
                                          <select
                                            className="pm-input"
                                            value={elementSource}
                                            onChange={(event) => {
                                              const nextSource = event.target.value
                                              const nextField = FIELDS_BY_SOURCE[nextSource][0]

                                              setElementDrafts((state) => ({
                                                ...state,
                                                [element.id]: {
                                                  ...state[element.id],
                                                  data_source: nextSource,
                                                  field: nextField
                                                }
                                              }))
                                            }}
                                          >
                                            {Object.keys(FIELDS_BY_SOURCE).map((source) => (
                                              <option key={source} value={source}>
                                                {source}
                                              </option>
                                            ))}
                                          </select>
                                        </td>

                                        <td>
                                          <select
                                            className="pm-input"
                                            value={elementDraft?.field || FIELDS_BY_SOURCE[elementSource][0]}
                                            onChange={(event) =>
                                              setElementDrafts((state) => ({
                                                ...state,
                                                [element.id]: {
                                                  ...state[element.id],
                                                  field: event.target.value
                                                }
                                              }))
                                            }
                                          >
                                            {FIELDS_BY_SOURCE[elementSource].map((field) => (
                                              <option key={field} value={field}>
                                                {field}
                                              </option>
                                            ))}
                                          </select>
                                        </td>

                                        <td>
                                          <input
                                            className="pm-input"
                                            value={elementDraft?.order || ''}
                                            onChange={(event) =>
                                              setElementDrafts((state) => ({
                                                ...state,
                                                [element.id]: {
                                                  ...state[element.id],
                                                  order: event.target.value
                                                }
                                              }))
                                            }
                                          />
                                        </td>

                                        <td>
                                          <label className="pm-check">
                                            <input
                                              type="checkbox"
                                              checked={Boolean(elementDraft?.is_visible)}
                                              onChange={(event) =>
                                                setElementDrafts((state) => ({
                                                  ...state,
                                                  [element.id]: {
                                                    ...state[element.id],
                                                    is_visible: event.target.checked
                                                  }
                                                }))
                                              }
                                            />
                                          </label>
                                        </td>

                                        <td>
                                          <div className="pm-row">
                                            <button
                                              type="button"
                                              className="pm-btn pm-btnSecondary"
                                              onClick={() => saveElement(section, block, element)}
                                              disabled={busy}
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              className="pm-btn pm-btnDanger"
                                              onClick={() => removeElement(section, block, element)}
                                              disabled={busy}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
