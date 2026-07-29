import type { CardFormat } from './formats'
import type { CardLayout } from './layouts'

// gpt-image-1 liefert feste Canvas-Größen; wir generieren hochkant.
export const IMAGE_SIZE = '1024x1536'
export const IMAGE_RATIO = 1024 / 1536

// Die Karte wird per object-fit:cover aus der Bildmitte geschnitten. Dieses
// Fenster beschreibt den sichtbaren Ausschnitt als Anteile (0..1) des Bildes.
export interface CropWindow {
  left: number
  top: number
  width: number
  height: number
}

export function cropWindow(format: CardFormat): CropWindow {
  const cardRatio = format.widthMm / format.heightMm
  if (cardRatio >= IMAGE_RATIO) {
    // Karte ist breiter als der Canvas: oben und unten wird beschnitten.
    const height = IMAGE_RATIO / cardRatio
    return { left: 0, top: (1 - height) / 2, width: 1, height }
  }
  // Karte ist schmaler als der Canvas: links und rechts wird beschnitten.
  const width = cardRatio / IMAGE_RATIO
  return { left: (1 - width) / 2, top: 0, width, height: 1 }
}

export interface Zone {
  label: string
  x0: number
  y0: number
  x1: number
  y1: number
}

// Rechnet die Layout-Regionen von Karten-Prozenten in Bild-Prozente um und
// fasst Regionen mit gleichem Label (z. B. Tabellenzeilen) zu einer Zone
// zusammen.
export function layoutZones(format: CardFormat, layout: CardLayout): Zone[] {
  const crop = cropWindow(format)
  const zones = new Map<string, Zone>()
  for (const r of layout.regions) {
    const x0 = (crop.left + (r.x / 100) * crop.width) * 100
    const y0 = (crop.top + (r.y / 100) * crop.height) * 100
    const x1 = (crop.left + ((r.x + r.w) / 100) * crop.width) * 100
    const y1 = (crop.top + ((r.y + r.h) / 100) * crop.height) * 100
    const existing = zones.get(r.label)
    if (existing) {
      existing.x0 = Math.min(existing.x0, x0)
      existing.y0 = Math.min(existing.y0, y0)
      existing.x1 = Math.max(existing.x1, x1)
      existing.y1 = Math.max(existing.y1, y1)
    } else {
      zones.set(r.label, { label: r.label, x0, y0, x1, y1 })
    }
  }
  return [...zones.values()]
}
