import type { CardFormat } from './formats'
import { cropWindow } from './geometry'
import type { CardLayout } from './layouts'

const CANVAS_W = 1024
const CANVAS_H = 1536

const TRIM_COLOR = '#e4e4e4'
const CARD_COLOR = '#ffffff'
const ART_COLOR = '#aeb5bd'
const TEXT_COLOR = '#d9dce0'

// Zeichnet die Layout-Schablone für die Bildgenerierung: weiße Kartenfläche,
// der im Druck wegfallende Beschnitt leicht abgedunkelt, die Inhaltszonen als
// graue Rechtecke — exakt aus derselben Regionen-Geometrie wie Karteneditor
// und PDF-Export. Der Generator erhält die Schablone als Basisbild und baut
// das Rahmendesign strukturtreu um diese Zonen herum.
export function renderLayoutTemplate(format: CardFormat, layout: CardLayout): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar.')

  const crop = cropWindow(format)
  const cardX = crop.left * CANVAS_W
  const cardY = crop.top * CANVAS_H
  const cardW = crop.width * CANVAS_W
  const cardH = crop.height * CANVAS_H

  ctx.fillStyle = TRIM_COLOR
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.fillStyle = CARD_COLOR
  ctx.fillRect(cardX, cardY, cardW, cardH)

  const em = cardW / 15
  for (const region of layout.regions) {
    const x = cardX + (region.x / 100) * cardW
    const y = cardY + (region.y / 100) * cardH
    const w = (region.w / 100) * cardW
    const h = (region.h / 100) * cardH
    ctx.fillStyle = region.kind === 'art' ? ART_COLOR : TEXT_COLOR
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, (region.kind === 'art' ? 0.4 : 0.25) * em)
    ctx.fill()
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Schablone konnte nicht erzeugt werden.'))
    }, 'image/png')
  })
}
