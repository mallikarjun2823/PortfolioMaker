import React, { useEffect, useState } from 'react'

export default function Reveal({ children, className = '', style, delay = 0 }) {
  const [node, setNode] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = node
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true)
            obs.disconnect()
            break
          }
        }
      },
      { threshold: 0.15 }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [node])

  return (
    <div
      ref={setNode}
      className={`reveal ${visible ? 'revealVisible' : ''} ${className}`.trim()}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
