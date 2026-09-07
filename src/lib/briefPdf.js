// ---------------------------------------------------------------------------
// EXECUTIVE BRIEF → PDF
//
// Walks the brief document model and lays it out on A4 with jsPDF. The text is
// written as text, not rasterised, so the finished file stays selectable,
// searchable and small — which a canvas snapshot of the DOM would not be.
//
// The layout mirrors what `BriefPaper` renders on screen: same order, same
// tables, same severity colouring. jsPDF is imported dynamically so it only
// reaches the browser when someone actually exports.
// ---------------------------------------------------------------------------

import { cellText, cellColor, fmtLong } from './executiveBrief'

// A4 in points.
const PAGE = { w: 595.28, h: 841.89 }
const M = { top: 58, right: 52, bottom: 58, left: 52 }
const CONTENT_W = PAGE.w - M.left - M.right

const INK = '#0f172a'
const INK_DIM = '#475569'
const INK_MUTE = '#7c8aa0'
const HAIR = '#dbe3ee'
const ZEBRA = '#f7f9fc'
const BRAND = '#0b6ea8'

const TONE = {
  critical: { bg: '#fdecec', bar: '#dc2626', text: '#7f1d1d' },
  warning: { bg: '#fef6e7', bar: '#d97706', text: '#78350f' },
  info: { bg: '#eaf4fb', bar: '#0b6ea8', text: '#0c3f5e' },
}

// jsPDF's built-in fonts encode cp1252, so anything outside it (the arrows and
// approximation signs the routing engine writes) would come out as garbage and
// throw the line's measured width off with it. Everything written to the page
// goes through here first.
const GLYPH_FIXES = [
  [/[\u2192\u27a1]/g, '->'],
  [/\u2190/g, '<-'],
  [/\u2194/g, '<->'],
  [/\u2248/g, '~'],
  [/\u2264/g, '<='],
  [/\u2265/g, '>='],
  [/[\u2010\u2011]/g, '-'],
  [/\u00a0/g, ' '],
]

const CP1252_EXTRAS =
  '\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178'
const UNPRINTABLE = new RegExp(`[^\\x00-\\xff${CP1252_EXTRAS}]`, 'g')

function sanitize(value) {
  let out = String(value ?? '')
  for (const [re, to] of GLYPH_FIXES) out = out.replace(re, to)
  return out.replace(UNPRINTABLE, '?')
}

/** Layout cursor. Everything below draws through this. */
function makeWriter(pdf) {
  const w = {
    pdf,
    y: M.top,
    /** Reserve vertical space, breaking the page when it will not fit. */
    need(h) {
      if (w.y + h > PAGE.h - M.bottom) {
        pdf.addPage()
        w.y = M.top
        return true
      }
      return false
    },
    gap(h) {
      w.y += h
    },
    rule(color = HAIR, width = 0.5) {
      pdf.setDrawColor(color)
      pdf.setLineWidth(width)
      pdf.line(M.left, w.y, M.left + CONTENT_W, w.y)
    },
    /** Wrapped text block. Returns the height consumed. */
    text(str, { font = 'times', style = 'normal', size = 10, color = INK, leading = 1.36, x = M.left, width = CONTENT_W, align = 'left' } = {}) {
      pdf.setFont(font, style)
      pdf.setFontSize(size)
      pdf.setTextColor(color)
      const lines = pdf.splitTextToSize(sanitize(str), width)
      const lh = size * leading
      for (const line of lines) {
        w.need(lh)
        pdf.text(line, align === 'right' ? x + width : align === 'center' ? x + width / 2 : x, w.y + size * 0.85, {
          align,
        })
        w.y += lh
      }
      return lines.length * lh
    },
  }
  return w
}

function measure(pdf, str, { font = 'helvetica', style = 'normal', size = 9 } = {}) {
  pdf.setFont(font, style)
  pdf.setFontSize(size)
  return pdf.getTextWidth(sanitize(str))
}

// --- blocks -----------------------------------------------------------------

function drawHeading(w, text, level) {
  const size = level <= 1 ? 14 : level === 2 ? 11.5 : 10
  w.gap(level <= 1 ? 16 : 12)
  w.need(size * 2.4)
  if (level <= 1) {
    w.pdf.setDrawColor(BRAND)
    w.pdf.setLineWidth(1.6)
    w.pdf.line(M.left, w.y, M.left + 34, w.y)
    w.gap(9)
  }
  w.text(text, { font: 'helvetica', style: 'bold', size, color: level <= 1 ? INK : level === 2 ? INK : BRAND, leading: 1.28 })
  w.gap(level <= 1 ? 7 : 4)
}

function drawParagraph(w, text) {
  if (!String(text || '').trim()) return
  w.text(text, { font: 'times', size: 10.2, color: INK, leading: 1.42 })
  w.gap(8)
}

function drawBullets(w, items) {
  const indent = 14
  for (const item of items) {
    if (!String(item || '').trim()) continue
    // Keep the glyph with the text it belongs to: reserve the first two lines
    // so a bullet never lands alone at the foot of a page.
    w.pdf.setFont('times', 'normal')
    w.pdf.setFontSize(10.2)
    const lines = w.pdf.splitTextToSize(sanitize(item), CONTENT_W - indent)
    w.need(Math.min(lines.length, 2) * 10.2 * 1.42)
    const bulletY = w.y
    w.text(item, { font: 'times', size: 10.2, color: INK, leading: 1.42, x: M.left + indent, width: CONTENT_W - indent })
    w.pdf.setFillColor(BRAND)
    w.pdf.circle(M.left + 5, bulletY + 4.4, 1.5, 'F')
    w.gap(2.5)
  }
  w.gap(6)
}

function drawKpi(w, items) {
  if (!items?.length) return
  const gap = 9
  const boxW = (CONTENT_W - gap * (items.length - 1)) / items.length
  const boxH = 50
  w.need(boxH + 8)
  const top = w.y
  items.forEach((it, i) => {
    const x = M.left + i * (boxW + gap)
    w.pdf.setFillColor('#f4f7fb')
    w.pdf.setDrawColor(HAIR)
    w.pdf.setLineWidth(0.5)
    w.pdf.roundedRect(x, top, boxW, boxH, 4, 4, 'FD')
    w.pdf.setFont('helvetica', 'bold')
    w.pdf.setFontSize(6.6)
    w.pdf.setTextColor(INK_MUTE)
    w.pdf.text(sanitize(it.label).toUpperCase(), x + 9, top + 15)
    w.pdf.setFont('helvetica', 'bold')
    w.pdf.setFontSize(15)
    w.pdf.setTextColor(it.color || INK)
    w.pdf.text(sanitize(it.value), x + 9, top + 33)
    if (it.sub) {
      w.pdf.setFont('helvetica', 'normal')
      w.pdf.setFontSize(7.2)
      w.pdf.setTextColor(INK_MUTE)
      w.pdf.text(sanitize(it.sub), x + 9, top + 43)
    }
  })
  w.y = top + boxH
  w.gap(12)
}

function drawCallout(w, block) {
  const tone = TONE[block.tone] || TONE.info
  const pad = 10
  const innerW = CONTENT_W - pad * 2 - 4
  w.pdf.setFont('helvetica', 'bold')
  w.pdf.setFontSize(9.6)
  const titleLines = w.pdf.splitTextToSize(sanitize(block.title), innerW)
  w.pdf.setFont('times', 'normal')
  w.pdf.setFontSize(9.8)
  const bodyLines = w.pdf.splitTextToSize(sanitize(block.text), innerW)
  const h = pad * 2 + titleLines.length * 13 + (bodyLines.length ? bodyLines.length * 13 : 0)
  w.need(h + 10)
  const top = w.y
  w.pdf.setFillColor(tone.bg)
  w.pdf.rect(M.left, top, CONTENT_W, h, 'F')
  w.pdf.setFillColor(tone.bar)
  w.pdf.rect(M.left, top, 3, h, 'F')

  let y = top + pad + 9
  w.pdf.setFont('helvetica', 'bold')
  w.pdf.setFontSize(9.6)
  w.pdf.setTextColor(tone.bar)
  for (const line of titleLines) {
    w.pdf.text(line, M.left + pad + 4, y)
    y += 13
  }
  w.pdf.setFont('times', 'normal')
  w.pdf.setFontSize(9.8)
  w.pdf.setTextColor(tone.text)
  for (const line of bodyLines) {
    w.pdf.text(line, M.left + pad + 4, y)
    y += 13
  }
  w.y = top + h
  w.gap(12)
}

function drawTable(w, block) {
  const cols = block.columns || []
  const rows = block.rows || []
  if (!cols.length) return
  const pad = 5
  const size = 8.2

  // Column widths proportional to the widest cell, floored so a narrow column
  // still fits its header, then normalised to the content width.
  const raw = cols.map((c, i) => {
    let max = measure(w.pdf, c, { style: 'bold', size })
    for (const r of rows) max = Math.max(max, measure(w.pdf, cellText(r[i]), { size }))
    return Math.min(Math.max(max + pad * 2, 42), 210)
  })
  const sum = raw.reduce((a, b) => a + b, 0)
  const widths = raw.map((v) => (v / sum) * CONTENT_W)

  const wrap = (text, i, style = 'normal') => {
    w.pdf.setFont('helvetica', style)
    w.pdf.setFontSize(size)
    return w.pdf.splitTextToSize(sanitize(text), widths[i] - pad * 2)
  }

  const headerH = Math.max(...cols.map((c, i) => wrap(c, i, 'bold').length)) * 10 + pad * 2

  const drawHeader = () => {
    const top = w.y
    w.pdf.setFillColor('#eef3f9')
    w.pdf.rect(M.left, top, CONTENT_W, headerH, 'F')
    let x = M.left
    cols.forEach((c, i) => {
      const lines = wrap(c, i, 'bold')
      w.pdf.setFont('helvetica', 'bold')
      w.pdf.setFontSize(size)
      w.pdf.setTextColor(INK_DIM)
      lines.forEach((line, li) => w.pdf.text(line, x + pad, top + pad + 7 + li * 10))
      x += widths[i]
    })
    w.pdf.setDrawColor('#c8d4e4')
    w.pdf.setLineWidth(0.6)
    w.pdf.line(M.left, top + headerH, M.left + CONTENT_W, top + headerH)
    w.y = top + headerH
  }

  w.need(headerH + 34)
  drawHeader()

  rows.forEach((row, ri) => {
    const cellLines = cols.map((_, i) => wrap(cellText(row[i]), i))
    const rowH = Math.max(...cellLines.map((l) => l.length)) * 10 + pad * 2
    if (w.need(rowH)) drawHeader()
    const top = w.y
    if (ri % 2 === 1) {
      w.pdf.setFillColor(ZEBRA)
      w.pdf.rect(M.left, top, CONTENT_W, rowH, 'F')
    }
    let x = M.left
    cellLines.forEach((lines, i) => {
      const color = cellColor(row[i])
      w.pdf.setFont('helvetica', color ? 'bold' : 'normal')
      w.pdf.setFontSize(size)
      w.pdf.setTextColor(color || (i === 0 ? INK : INK_DIM))
      lines.forEach((line, li) => w.pdf.text(line, x + pad, top + pad + 7 + li * 10))
      x += widths[i]
    })
    w.pdf.setDrawColor(HAIR)
    w.pdf.setLineWidth(0.4)
    w.pdf.line(M.left, top + rowH, M.left + CONTENT_W, top + rowH)
    w.y = top + rowH
  })

  if (block.caption) {
    w.gap(6)
    w.text(block.caption, { font: 'helvetica', style: 'italic', size: 7.6, color: INK_MUTE, leading: 1.3 })
  }
  w.gap(12)
}

function drawBlock(w, block) {
  switch (block.type) {
    case 'heading':
      return drawHeading(w, block.text, block.level ?? 3)
    case 'bullets':
      return drawBullets(w, block.items || [])
    case 'kpi':
      return drawKpi(w, block.items || [])
    case 'table':
      return drawTable(w, block)
    case 'callout':
      return drawCallout(w, block)
    default:
      return drawParagraph(w, block.text)
  }
}

// --- cover, running header, footer ------------------------------------------

function drawCover(w, doc) {
  const pdf = w.pdf
  // The masthead grows with the title, so a two-line voyage name never runs
  // over the rule underneath it.
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(19)
  const titleLines = pdf.splitTextToSize(sanitize(doc.title), CONTENT_W).slice(0, 3)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const subLines = pdf.splitTextToSize(sanitize(doc.subtitle), CONTENT_W).slice(0, 2)
  const bandH = 52 + titleLines.length * 23 + subLines.length * 12 + 12

  pdf.setFillColor('#0e1524')
  pdf.rect(0, 0, PAGE.w, bandH, 'F')
  pdf.setFillColor(BRAND)
  pdf.rect(0, bandH, PAGE.w, 2.5, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor('#7dd3fc')
  pdf.text('ORBIT · OVERSEAS RISK BASED INTELLIGENCE TOOLS', M.left, 40)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(19)
  pdf.setTextColor('#ffffff')
  titleLines.forEach((line, i) => pdf.text(line, M.left, 68 + i * 23))

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#9fb0cc')
  subLines.forEach((line, i) => pdf.text(line, M.left, 68 + titleLines.length * 23 + i * 12))

  w.y = bandH + 26

  // Document control grid.
  const rows = [
    ['Reference', doc.reference, 'Reporting date', fmtLong(doc.asOf)],
    ['Vessel', doc.meta?.vessel, 'Voyage', doc.meta?.voyage],
    ['Prepared by', doc.preparedBy, 'Risk rating', doc.meta?.rating],
    ['Distribution', doc.distribution, 'Options assessed', String(doc.meta?.options ?? '')],
  ]
  const colW = [78, CONTENT_W / 2 - 78, 92, CONTENT_W / 2 - 92]
  for (const row of rows) {
    const heights = row.map((cell, i) => {
      w.pdf.setFont(i % 2 === 0 ? 'helvetica' : 'helvetica', i % 2 === 0 ? 'bold' : 'normal')
      w.pdf.setFontSize(8.4)
      return w.pdf.splitTextToSize(sanitize(cell ?? '—'), colW[i] - 6).length
    })
    const rowH = Math.max(...heights) * 11 + 8
    w.need(rowH)
    let x = M.left
    row.forEach((cell, i) => {
      pdf.setFont('helvetica', i % 2 === 0 ? 'bold' : 'normal')
      pdf.setFontSize(8.4)
      pdf.setTextColor(i % 2 === 0 ? INK_MUTE : INK)
      const lines = pdf.splitTextToSize(sanitize(cell ?? '—'), colW[i] - 6)
      lines.forEach((line, li) => pdf.text(line, x, w.y + 8 + li * 11))
      x += colW[i]
    })
    w.y += rowH
    w.rule()
  }

  // Classification strip.
  w.gap(14)
  const strip = 20
  pdf.setFillColor('#fef6e7')
  pdf.rect(M.left, w.y, CONTENT_W, strip, 'F')
  pdf.setFillColor('#d97706')
  pdf.rect(M.left, w.y, 3, strip, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor('#78350f')
  pdf.text(sanitize(doc.classification), M.left + 12, w.y + 13.5)
  w.y += strip
  w.gap(6)
}

function stampChrome(pdf, doc) {
  const total = pdf.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    if (i > 1) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.4)
      pdf.setTextColor(INK_MUTE)
      pdf.text(sanitize(doc.title), M.left, 32)
      pdf.text(sanitize(doc.reference), M.left + CONTENT_W, 32, { align: 'right' })
      pdf.setDrawColor(HAIR)
      pdf.setLineWidth(0.5)
      pdf.line(M.left, 38, M.left + CONTENT_W, 38)
    }
    const footY = PAGE.h - 32
    pdf.setDrawColor(HAIR)
    pdf.setLineWidth(0.5)
    pdf.line(M.left, footY - 12, M.left + CONTENT_W, footY - 12)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.2)
    pdf.setTextColor(INK_MUTE)
    pdf.text(sanitize(`ORBIT · ${doc.reference || ''}`), M.left, footY)
    pdf.text(sanitize(doc.classification), M.left + CONTENT_W / 2, footY, { align: 'center' })
    pdf.text(`Page ${i} of ${total}`, M.left + CONTENT_W, footY, { align: 'right' })
  }
}

// --- public -----------------------------------------------------------------

export function briefFileName(doc) {
  const slug = String(doc?.title || 'executive-brief')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70)
  return `${slug || 'executive-brief'}-${String(doc?.asOf || '').replace(/-/g, '')}.pdf`
}

/** Lays the brief out and returns the jsPDF document, unsaved. */
export async function renderBriefPdf(doc) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  pdf.setProperties({
    title: doc.title,
    subject: doc.subtitle,
    author: doc.preparedBy || 'ORBIT',
    creator: 'ORBIT — Overseas Risk Based Intelligence Tools',
  })

  const w = makeWriter(pdf)
  drawCover(w, doc)

  for (const section of doc.sections || []) {
    drawHeading(w, section.heading, 1)
    for (const block of section.blocks || []) drawBlock(w, block)
  }

  stampChrome(pdf, doc)
  return pdf
}

/** Renders the brief and hands the browser a download. */
export async function exportBriefPdf(doc) {
  const pdf = await renderBriefPdf(doc)
  const name = briefFileName(doc)
  pdf.save(name)
  return name
}
