import type { jsPDF } from 'jspdf'

import type { CardFormat } from './formats'
import type { CardLayout, TextRegion } from './layouts'
import type { CardTheme } from './theme'

// Druckauflösung der gerenderten Karten.
const DPI = 300
const PX_PER_MM = DPI / 25.4

// A4-Bogen: Rand, Kartenabstand und Schnittmarken, alles in Millimetern.
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 8
const GAP = 6
const MARK_LEN = 3
const MARK_OFF = 1

const FONT_WEIGHTS = { normal: 400, medium: 500, semibold: 600 } as const

const FALLBACK_FONT = 'ui-sans-serif, system-ui, sans-serif'
const FALLBACK_INK = '#1f2937'
const FALLBACK_PANEL = 'rgba(255, 255, 255, 0.65)'

export interface ExportCard {
  image?: string
  values: Record<string, string>
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
    img.src = src
  })
}

// Zeichnet ein Bild formatfüllend in das Zielrechteck (wie object-fit: cover).
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines
}

function drawTextRegion(
  ctx: CanvasRenderingContext2D,
  region: TextRegion,
  value: string,
  theme: CardTheme | null,
  cardW: number,
  cardH: number,
) {
  const em = cardW / 15
  const x = (region.x / 100) * cardW
  const y = (region.y / 100) * cardH
  const w = (region.w / 100) * cardW
  const h = (region.h / 100) * cardH
  const fontPx = (region.size ?? 1) * em
  const pad = 0.35 * em

  ctx.save()
  if (region.rotate) {
    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate(Math.PI)
    ctx.translate(-(x + w / 2), -(y + h / 2))
  }

  // Feld-Hintergrund im Ton der Inhaltszone, wie im Editor.
  ctx.fillStyle = theme?.panel ?? FALLBACK_PANEL
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 0.25 * em)
  ctx.fill()

  ctx.fillStyle = theme?.ink ?? FALLBACK_INK
  ctx.font = `${FONT_WEIGHTS[region.weight ?? 'normal']} ${fontPx}px ${theme?.fontFamily ?? FALLBACK_FONT}`
  if (region.tracking && 'letterSpacing' in ctx) {
    ctx.letterSpacing = `${region.tracking * fontPx}px`
  }

  if (region.multiline) {
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 0.25 * em)
    ctx.clip()
    const lineHeight = 1.375 * fontPx
    wrapText(ctx, value, w - 2 * pad).forEach((line, i) => {
      ctx.fillText(line, x + pad, y + 0.25 * em + i * lineHeight)
    })
  } else {
    ctx.textBaseline = 'middle'
    const align = region.align ?? 'left'
    ctx.textAlign = align
    const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - pad : x + pad
    ctx.fillText(value, tx, y + h / 2, w - 2 * pad)
  }
  ctx.restore()
}

// Rendert eine Kartenvorderseite in Druckauflösung — mit exakt derselben
// Regionen-Geometrie und Typografie wie der Karteneditor.
function renderFront(
  format: CardFormat,
  layout: CardLayout,
  theme: CardTheme | null,
  frame: HTMLImageElement | null,
  art: HTMLImageElement | null,
  values: Record<string, string>,
): HTMLCanvasElement {
  const cardW = Math.round(format.widthMm * PX_PER_MM)
  const cardH = Math.round(format.heightMm * PX_PER_MM)
  const canvas = document.createElement('canvas')
  canvas.width = cardW
  canvas.height = cardH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cardW, cardH)
  if (frame) drawCover(ctx, frame, 0, 0, cardW, cardH)

  const em = cardW / 15
  for (const region of layout.regions) {
    if (region.kind === 'art') {
      if (!art) continue
      const x = (region.x / 100) * cardW
      const y = (region.y / 100) * cardH
      const w = (region.w / 100) * cardW
      const h = (region.h / 100) * cardH
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 0.4 * em)
      ctx.clip()
      drawCover(ctx, art, x, y, w, h)
      ctx.restore()
    } else {
      const value = (values[region.key] ?? '').trim()
      // Leere Felder bleiben im Druck unsichtbar.
      if (value) drawTextRegion(ctx, region, value, theme, cardW, cardH)
    }
  }
  return canvas
}

function renderBack(format: CardFormat, back: HTMLImageElement): HTMLCanvasElement {
  const cardW = Math.round(format.widthMm * PX_PER_MM)
  const cardH = Math.round(format.heightMm * PX_PER_MM)
  const canvas = document.createElement('canvas')
  canvas.width = cardW
  canvas.height = cardH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cardW, cardH)
  drawCover(ctx, back, 0, 0, cardW, cardH)
  return canvas
}

// Schnittmarken an allen vier Ecken einer Karte, außerhalb der Kartenfläche.
function drawCropMarks(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(0)
  doc.setLineWidth(0.2)
  for (const [cx, dirX] of [
    [x, -1],
    [x + w, 1],
  ] as const) {
    for (const [cy, dirY] of [
      [y, -1],
      [y + h, 1],
    ] as const) {
      doc.line(cx + dirX * MARK_OFF, cy, cx + dirX * (MARK_OFF + MARK_LEN), cy)
      doc.line(cx, cy + dirY * MARK_OFF, cx, cy + dirY * (MARK_OFF + MARK_LEN))
    }
  }
}

// Wartet darauf, dass die Theme-Schrift in allen benutzten Schnitten geladen
// ist, damit das Canvas-Rendering nicht auf eine Ersatzschrift zurückfällt.
async function ensureFontsReady(theme: CardTheme | null) {
  if (theme) {
    try {
      await Promise.all(
        Object.values(FONT_WEIGHTS).map((w) =>
          document.fonts.load(`${w} 16px ${theme.fontFamily}`),
        ),
      )
    } catch {
      // Schrift nicht ladbar — der Browser rendert mit der Ersatzschrift.
    }
  }
  await document.fonts.ready
}

// Setzt alle Karten maßhaltig auf A4-Bögen mit Schnittmarken. Gibt es ein
// Rückseiten-Design, folgt auf jeden Vorderseiten-Bogen ein horizontal
// gespiegelter Rückseiten-Bogen für den Duplexdruck über die lange Kante.
export async function exportCardsPdf(
  format: CardFormat,
  layout: CardLayout,
  cards: ExportCard[],
  frames: { front?: string; back?: string },
  theme: CardTheme | null,
): Promise<void> {
  // jspdf wird erst beim Export geladen und bläht das Hauptbundle nicht auf.
  const { jsPDF } = await import('jspdf')
  await ensureFontsReady(theme)

  const frameImg = frames.front ? await loadImage(frames.front) : null
  const backImg = frames.back ? await loadImage(frames.back) : null
  const artImgs = await Promise.all(cards.map((c) => (c.image ? loadImage(c.image) : null)))

  const w = format.widthMm
  const h = format.heightMm
  const cols = Math.max(1, Math.floor((PAGE_W - 2 * MARGIN + GAP) / (w + GAP)))
  const rows = Math.max(1, Math.floor((PAGE_H - 2 * MARGIN + GAP) / (h + GAP)))
  const perPage = cols * rows
  const offX = (PAGE_W - (cols * w + (cols - 1) * GAP)) / 2
  const offY = (PAGE_H - (rows * h + (rows - 1) * GAP)) / 2

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setProperties({ title: `Card Maker — ${format.name} Kartenbogen` })
  const backData = backImg
    ? renderBack(format, backImg).toDataURL('image/jpeg', 0.95)
    : null

  for (let start = 0; start < cards.length; start += perPage) {
    const chunk = cards.slice(start, start + perPage)
    if (start > 0) doc.addPage()

    const cells = chunk.map((card, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      return {
        card,
        art: artImgs[start + i],
        x: offX + col * (w + GAP),
        y: offY + row * (h + GAP),
      }
    })

    for (const cell of cells) {
      const canvas = renderFront(format, layout, theme, frameImg, cell.art, cell.card.values)
      doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', cell.x, cell.y, w, h)
      drawCropMarks(doc, cell.x, cell.y, w, h)
    }

    if (backData) {
      doc.addPage()
      for (const cell of cells) {
        // Spiegelung an der Blattmitte, damit Vorder- und Rückseite beim
        // beidseitigen Druck deckungsgleich liegen.
        const bx = PAGE_W - cell.x - w
        doc.addImage(backData, 'JPEG', bx, cell.y, w, h)
        drawCropMarks(doc, bx, cell.y, w, h)
      }
    }
  }

  doc.save('karten.pdf')
}
