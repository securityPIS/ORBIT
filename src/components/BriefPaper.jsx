import { useEffect, useRef } from 'react'
import { Plus, List, Trash2, Minus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cellText, cellColor, setCellText, fmtLong, paperColor } from '../lib/executiveBrief'

// ---------------------------------------------------------------------------
// The document surface. One component renders both the editor and the copy the
// browser prints, so what is on screen and what comes out of the printer can
// never drift apart — `readOnly` is the only difference between them.
// ---------------------------------------------------------------------------

/**
 * A contenteditable that behaves. React never re-renders the text while the
 * caret is inside it (which is what makes contenteditable jump), so the value
 * is pushed in imperatively and only when the field is not focused.
 */
function Editable({
  value,
  onCommit,
  as: Tag = 'div',
  className = '',
  placeholder,
  singleLine = false,
  onEnter,
  eid,
  readOnly = false,
  style,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || readOnly) return
    if (document.activeElement !== el && el.innerText !== (value ?? '')) el.innerText = value ?? ''
  })

  if (readOnly) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    )
  }

  const commit = (el) => {
    const text = el.innerText.replace(/ /g, ' ').replace(/\n+$/, '')
    if (text !== (value ?? '')) onCommit(text)
  }

  return (
    <Tag
      ref={ref}
      data-eid={eid}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      className={`brief-editable ${className}`}
      style={style}
      onBlur={(e) => commit(e.currentTarget)}
      onPaste={(e) => {
        // Keep pasted formatting out of the model — everything here is plain text.
        e.preventDefault()
        const text = (e.clipboardData || window.clipboardData).getData('text/plain')
        document.execCommand('insertText', false, singleLine ? text.replace(/\s*\n+\s*/g, ' ') : text)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.shiftKey) return
        if (onEnter) {
          e.preventDefault()
          commit(e.currentTarget)
          onEnter()
        } else if (singleLine) {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
    />
  )
}

/**
 * Puts the caret in a freshly inserted field. The store update and React's
 * commit are not the same tick, so the field may not exist on the next frame —
 * keep looking for a few frames before giving up.
 */
function focusEid(eid, attempt = 0) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-eid="${CSS.escape(eid)}"]`)
    if (!el) {
      if (attempt < 10) focusEid(eid, attempt + 1)
      return
    }
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  })
}

function ToolButton({ title, onClick, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="grid h-[19px] w-[19px] place-items-center rounded border border-[#dbe3ee] bg-white text-[#7c8aa0] shadow-sm transition-colors hover:border-[#0b6ea8] hover:text-[#0b6ea8]"
    >
      {children}
    </button>
  )
}

/** The margin controls Word puts on a paragraph: add below, or delete. */
function BlockTools({ onAdd, onAddList, onDelete }) {
  // A row, not a stack: the controls have to stay inside the block's own box or
  // the pointer leaves the block on its way to them and they disappear. A row
  // is no taller than a single line of text, so even a one-line heading holds
  // its own controls.
  return (
    <div className="no-print invisible absolute left-0 top-[1px] flex gap-[3px] group-focus-within:visible group-hover:visible">
      <ToolButton title="Add a paragraph below" onClick={onAdd}>
        <Plus className="h-3 w-3" />
      </ToolButton>
      <ToolButton title="Add a bullet list below" onClick={onAddList}>
        <List className="h-3 w-3" />
      </ToolButton>
      <ToolButton title="Delete this block" onClick={onDelete}>
        <Trash2 className="h-3 w-3" />
      </ToolButton>
    </div>
  )
}

// --- block renderers --------------------------------------------------------

function Bullets({ block, patch, readOnly }) {
  const items = block.items || []
  return (
    <ul className="brief-avoid-break my-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="relative flex gap-2.5 pl-1">
          <span className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#0b6ea8]" />
          <Editable
            readOnly={readOnly}
            eid={`${block.id}:${i}`}
            value={item}
            placeholder="List item"
            onCommit={(text) => patch({ items: items.map((v, j) => (j === i ? text : v)) })}
            onEnter={() => {
              const next = [...items]
              next.splice(i + 1, 0, '')
              patch({ items: next })
              focusEid(`${block.id}:${i + 1}`)
            }}
            className="min-w-0 flex-1 font-serif text-[13.2px] leading-[1.62] text-[#1e293b]"
          />
          {!readOnly && items.length > 1 && (
            <button
              onClick={() => patch({ items: items.filter((_, j) => j !== i) })}
              title="Remove this item"
              className="no-print invisible mt-0.5 h-4 w-4 shrink-0 rounded text-[#c3cddd] transition hover:text-[#b91c1c] group-hover:visible"
            >
              <Minus className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function Table({ block, patch, readOnly }) {
  const columns = block.columns || []
  const rows = block.rows || []
  return (
    <div className="brief-avoid-break my-3.5">
      <div className="overflow-hidden rounded-[3px] border border-[#dbe3ee]">
        <table className="w-full border-collapse text-left align-top">
          <thead>
            <tr className="bg-[#eef3f9]">
              {columns.map((c, i) => (
                <th key={i} className="border-b border-[#c8d4e4] px-2.5 py-1.5">
                  <Editable
                    readOnly={readOnly}
                    value={c}
                    singleLine
                    placeholder="Heading"
                    onCommit={(text) => patch({ columns: columns.map((v, j) => (j === i ? text : v)) })}
                    className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#475569]"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 ? 'bg-[#f7f9fc]' : ''}>
                {columns.map((_, ci) => {
                  const cell = row[ci]
                  const color = cellColor(cell)
                  return (
                    <td key={ci} className="border-b border-[#e8eef6] px-2.5 py-1.5 last:border-r-0">
                      <Editable
                        readOnly={readOnly}
                        value={cellText(cell)}
                        placeholder="—"
                        onCommit={(text) =>
                          patch({
                            rows: rows.map((r, j) =>
                              j !== ri ? r : r.map((c, k) => (k === ci ? setCellText(c, text) : c))
                            ),
                          })
                        }
                        className={`text-[11.5px] leading-[1.45] ${color ? 'font-bold' : ci === 0 ? 'font-medium text-[#0f172a]' : 'text-[#475569]'}`}
                        style={color ? { color: paperColor(color) } : undefined}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {block.caption && (
        <Editable
          readOnly={readOnly}
          value={block.caption}
          onCommit={(text) => patch({ caption: text })}
          className="mt-1.5 text-[10.5px] italic text-[#7c8aa0]"
        />
      )}

      {!readOnly && (
        <div className="no-print invisible mt-1.5 flex gap-2 group-hover:visible">
          <button
            onClick={() => patch({ rows: [...rows, columns.map(() => '')] })}
            className="inline-flex items-center gap-1 rounded-md border border-[#dbe3ee] bg-white px-2 py-1 text-[10.5px] font-semibold text-[#475569] hover:border-[#0b6ea8] hover:text-[#0b6ea8]"
          >
            <Plus className="h-3 w-3" /> Row
          </button>
          {rows.length > 1 && (
            <button
              onClick={() => patch({ rows: rows.slice(0, -1) })}
              className="inline-flex items-center gap-1 rounded-md border border-[#dbe3ee] bg-white px-2 py-1 text-[10.5px] font-semibold text-[#475569] hover:border-[#b91c1c] hover:text-[#b91c1c]"
            >
              <Minus className="h-3 w-3" /> Row
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Kpi({ block, patch, readOnly }) {
  const items = block.items || []
  return (
    <div className="brief-avoid-break my-3.5 grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it, i) => (
        <div key={i} className="rounded-[4px] border border-[#dbe3ee] bg-[#f4f7fb] px-3 py-2.5">
          <Editable
            readOnly={readOnly}
            value={it.label}
            singleLine
            onCommit={(text) => patch({ items: items.map((v, j) => (j === i ? { ...v, label: text } : v)) })}
            className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#7c8aa0]"
          />
          <Editable
            readOnly={readOnly}
            value={it.value}
            singleLine
            onCommit={(text) => patch({ items: items.map((v, j) => (j === i ? { ...v, value: text } : v)) })}
            className="mt-1 text-[17px] font-bold leading-none text-[#0f172a]"
            style={it.color ? { color: paperColor(it.color) } : undefined}
          />
          <Editable
            readOnly={readOnly}
            value={it.sub}
            singleLine
            onCommit={(text) => patch({ items: items.map((v, j) => (j === i ? { ...v, sub: text } : v)) })}
            className="mt-1 text-[9.5px] text-[#7c8aa0]"
          />
        </div>
      ))}
    </div>
  )
}

const TONE = {
  critical: { bg: '#fdecec', bar: '#dc2626', text: '#7f1d1d' },
  warning: { bg: '#fef6e7', bar: '#d97706', text: '#78350f' },
  info: { bg: '#eaf4fb', bar: '#0b6ea8', text: '#0c3f5e' },
}

function Callout({ block, patch, readOnly }) {
  const tone = TONE[block.tone] || TONE.info
  return (
    <div
      className="brief-avoid-break my-3.5 border-l-[3px] px-3.5 py-3"
      style={{ background: tone.bg, borderColor: tone.bar }}
    >
      <Editable
        readOnly={readOnly}
        value={block.title}
        singleLine
        onCommit={(text) => patch({ title: text })}
        className="text-[12px] font-bold"
        style={{ color: tone.bar }}
      />
      <Editable
        readOnly={readOnly}
        value={block.text}
        onCommit={(text) => patch({ text })}
        className="mt-1 font-serif text-[12.5px] leading-[1.55]"
        style={{ color: tone.text }}
      />
    </div>
  )
}

function Block({ section, block, readOnly }) {
  const updateBriefBlock = useStore((s) => s.updateBriefBlock)
  const addBriefBlock = useStore((s) => s.addBriefBlock)
  const removeBriefBlock = useStore((s) => s.removeBriefBlock)
  const patch = (p) => updateBriefBlock(section.id, block.id, p)

  const insert = (type) => {
    const id = addBriefBlock(section.id, block.id, type)
    focusEid(type === 'bullets' ? `${id}:0` : id)
  }

  let body
  switch (block.type) {
    case 'heading':
      body = (
        <Editable
          readOnly={readOnly}
          eid={block.id}
          value={block.text}
          singleLine
          placeholder="Heading"
          onCommit={(text) => patch({ text })}
          className={
            block.level <= 2
              ? 'mb-1.5 mt-5 text-[15px] font-bold tracking-tight text-[#0f172a]'
              : 'mb-1 mt-4 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0b6ea8]'
          }
        />
      )
      break
    case 'bullets':
      body = <Bullets block={block} patch={patch} readOnly={readOnly} />
      break
    case 'table':
      body = <Table block={block} patch={patch} readOnly={readOnly} />
      break
    case 'kpi':
      body = <Kpi block={block} patch={patch} readOnly={readOnly} />
      break
    case 'callout':
      body = <Callout block={block} patch={patch} readOnly={readOnly} />
      break
    default:
      body = (
        <Editable
          readOnly={readOnly}
          eid={block.id}
          value={block.text}
          placeholder="Write here…"
          onCommit={(text) => patch({ text })}
          className="my-2 text-justify font-serif text-[13.2px] leading-[1.68] text-[#1e293b]"
        />
      )
  }

  return (
    <div className="brief-block group relative -ml-[68px] pl-[68px]">
      {!readOnly && (
        <BlockTools
          onAdd={() => insert('paragraph')}
          onAddList={() => insert('bullets')}
          onDelete={() => removeBriefBlock(section.id, block.id)}
        />
      )}
      {body}
    </div>
  )
}

// --- the document ------------------------------------------------------------

/** One line of the document-control grid on the cover. */
function Field({ label, value, onCommit, readOnly, editable = true, color }) {
  return (
    <div className="flex gap-2 border-b border-[#e8eef6] py-1.5">
      <span className="w-[92px] shrink-0 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#7c8aa0]">{label}</span>
      <Editable
        readOnly={readOnly || !editable}
        value={value}
        singleLine
        onCommit={onCommit || (() => {})}
        className="min-w-0 flex-1 text-[11.5px] font-medium text-[#0f172a]"
        style={color ? { color: paperColor(color) } : undefined}
      />
    </div>
  )
}

function Cover({ doc, readOnly }) {
  const updateBriefDoc = useStore((s) => s.updateBriefDoc)
  const set = (patch) => updateBriefDoc(patch)

  return (
    <div className="brief-avoid-break">
      <div className="brief-cover -mx-[64px] -mt-[56px] bg-[#0e1524] px-[64px] pb-6 pt-7">
        <div className="brief-eyebrow text-[9px] font-bold uppercase tracking-[0.18em] text-[#7dd3fc]">
          ORBIT · Overseas Risk Based Intelligence Tools
        </div>
        <Editable
          readOnly={readOnly}
          value={doc.title}
          singleLine
          placeholder="Document title"
          onCommit={(text) => set({ title: text })}
          className="brief-title mt-2.5 text-[25px] font-bold leading-tight tracking-tight text-white"
        />
        <Editable
          readOnly={readOnly}
          value={doc.subtitle}
          placeholder="Subtitle"
          onCommit={(text) => set({ subtitle: text })}
          className="brief-subtitle mt-1.5 text-[12.5px] leading-snug text-[#9fb0cc]"
        />
      </div>
      <div className="brief-cover-rule h-[3px] -mx-[64px] bg-[#0b6ea8]" />

      <div className="mt-6 grid grid-cols-2 gap-x-8">
        <Field readOnly={readOnly} label="Reference" value={doc.reference} onCommit={(text) => set({ reference: text })} />
        <Field readOnly={readOnly} label="Reporting date" value={fmtLong(doc.asOf)} editable={false} />
        <Field readOnly={readOnly} label="Vessel" value={doc.meta?.vessel} editable={false} />
        <Field readOnly={readOnly} label="Voyage" value={doc.meta?.voyage} editable={false} />
        <Field readOnly={readOnly} label="Prepared by" value={doc.preparedBy} onCommit={(text) => set({ preparedBy: text })} />
        <Field readOnly={readOnly} label="Risk rating" value={doc.meta?.rating} editable={false} color={doc.meta?.ratingColor} />
        <Field readOnly={readOnly} label="Distribution" value={doc.distribution} onCommit={(text) => set({ distribution: text })} />
        <Field readOnly={readOnly} label="Options assessed" value={String(doc.meta?.options ?? '')} editable={false} />
      </div>

      <div className="mt-5 border-l-[3px] border-[#d97706] bg-[#fef6e7] px-3 py-2">
        <Editable
          readOnly={readOnly}
          value={doc.classification}
          singleLine
          onCommit={(text) => set({ classification: text })}
          className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#78350f]"
        />
      </div>
    </div>
  )
}

export default function BriefPaper({ doc, readOnly = false }) {
  const updateBriefSection = useStore((s) => s.updateBriefSection)
  if (!doc) return null

  return (
    <article className="brief-paper mx-auto w-[794px] bg-white px-[64px] pb-[72px] pt-[56px] text-[#0f172a] shadow-[0_24px_70px_-20px_rgba(0,0,0,0.8)]">
      <Cover doc={doc} readOnly={readOnly} />

      {doc.sections.map((section) => (
        <section key={section.id} className="brief-section mt-8">
          <div className="brief-avoid-break">
            <div className="h-[2px] w-9 bg-[#0b6ea8]" />
            <Editable
              readOnly={readOnly}
              value={section.heading}
              singleLine
              onCommit={(text) => updateBriefSection(section.id, { heading: text })}
              className="mb-2 mt-2.5 text-[18px] font-bold tracking-tight text-[#0f172a]"
            />
          </div>
          {section.blocks.map((block) => (
            <Block key={block.id} section={section} block={block} readOnly={readOnly} />
          ))}
        </section>
      ))}

      <div className="mt-10 border-t border-[#dbe3ee] pt-3 text-[9.5px] text-[#7c8aa0]">
        {doc.reference} · {doc.classification} · Generated by ORBIT on {fmtLong(doc.asOf)}
      </div>
    </article>
  )
}
