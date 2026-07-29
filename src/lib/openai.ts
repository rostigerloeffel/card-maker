import type { CardFormat } from './formats'
import { cropWindow, IMAGE_SIZE, layoutZones } from './geometry'
import type { CardLayout } from './layouts'

const envApiKey = import.meta.env.VITE_OPENAI_API_KEY ?? ''

const STORAGE_KEY = 'card-maker.openai-api-key'

// Gespeicherter Token hat Vorrang, die Env-Variable dient als Vorbelegung.
export function loadApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? envApiKey
  } catch {
    return envApiKey
  }
}

export function saveApiKey(key: string) {
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ohne Storage (z. B. blockierte Cookies) gilt der Token nur für die Sitzung.
  }
}

export type CardSide = 'front' | 'back'

const pct = (n: number) => `${Math.round(n)}%`

function describeZones(format: CardFormat, layout: CardLayout): string {
  return layoutZones(format, layout)
    .map(
      (z) =>
        `a ${z.label} from ${pct(z.x0)} to ${pct(z.x1)} of the image width and ` +
        `${pct(z.y0)} to ${pct(z.y1)} of the image height`,
    )
    .join('; ')
}

// Beschreibt den Druckzuschnitt, wenn das Kartenformat vom Canvas-Verhältnis
// abweicht — alles außerhalb des Fensters wird abgeschnitten.
function describeCrop(format: CardFormat): string {
  const crop = cropWindow(format)
  if (crop.width > 0.99 && crop.height > 0.99) return ''
  return (
    `The printed card is ${format.widthMm} x ${format.heightMm} mm and is cut ` +
    `from the center of this image: only the area from ${pct(crop.left * 100)} to ` +
    `${pct((crop.left + crop.width) * 100)} of the image width and ${pct(crop.top * 100)} to ` +
    `${pct((crop.top + crop.height) * 100)} of the image height is kept. ` +
    `Place the border ornaments and every important frame element inside that area. `
  )
}

// Referenz-Prompt: übernimmt Format und Layout und beschreibt als Ziel ein
// reines Rahmendesign — ohne Text, Logos oder Beispielinhalte. Die
// Layout-Regionen gehen als konkrete Zonen mit Bildkoordinaten ein, damit
// später eingefügte Texte und Bilder sauber im Design sitzen.
export function buildFramePrompt(
  format: CardFormat,
  layout: CardLayout,
  stylePrompt: string,
  side: CardSide,
): string {
  const base =
    `Decorative frame template for a blank ${format.name} playing card, ` +
    `portrait, ${format.widthMm} x ${format.heightMm} mm, full bleed. ` +
    `Flat, print-ready illustration. Strictly no text, no letters, no logos, ` +
    `no sample content, no characters.`

  if (side === 'back') {
    return (
      `${base} This is the card back: a single symmetric ornamental ` +
      `composition covering the whole card. ${describeCrop(format)}` +
      `Style: ${stylePrompt}`
    )
  }

  return (
    `${base} This is the card front: an ornamental border along the edges ` +
    `framing the card's content zones. ${describeCrop(format)}` +
    `The card layout reserves these content zones: ${describeZones(format, layout)}. ` +
    `Render every content zone as a calm, even, low-contrast surface without ` +
    `ornament, so that text and pictures placed there later remain readable ` +
    `and blend into the design. You may give a zone a subtle panel or inset ` +
    `look, but keep its interior quiet. Concentrate all decorative detail in ` +
    `the space between and around these zones. Style: ${stylePrompt}`
  )
}

// Prompt für iterative Überarbeitungen: die Änderung des Nutzers plus die
// unverändert geltenden Grundregeln des Rahmendesigns samt Layout-Zonen.
export function buildRefinePrompt(
  format: CardFormat,
  layout: CardLayout,
  instruction: string,
  side: CardSide,
): string {
  const target =
    side === 'back'
      ? 'the symmetric ornamental composition of this card back'
      : 'the ornamental frame of this card front'
  const zoneRules =
    side === 'front'
      ? `Keep the reserved content zones calm, even, low-contrast and free of ` +
        `ornament: ${describeZones(format, layout)}. `
      : ''
  return (
    `Revise ${target} according to this request: ${instruction}. ` +
    `Keep everything else as it is. ${zoneRules}` +
    `Flat, print-ready illustration. ` +
    `Strictly no text, no letters, no logos, no sample content, no characters.`
  )
}

async function parseImageResponse(res: Response): Promise<string> {
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Bildgenerierung fehlgeschlagen (${res.status}). ${body}`)
  }

  const data = (await res.json()) as { data?: { b64_json?: string }[] }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) {
    throw new Error('Bildgenerierung lieferte kein Ergebnis.')
  }
  return `data:image/png;base64,${b64}`
}

function requireKey(apiKey: string): string {
  const key = apiKey.trim()
  if (!key) {
    throw new Error('Kein API-Token angegeben.')
  }
  return key
}

export async function generateFrame(
  apiKey: string,
  format: CardFormat,
  layout: CardLayout,
  stylePrompt: string,
  side: CardSide,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireKey(apiKey)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: buildFramePrompt(format, layout, stylePrompt, side),
      size: IMAGE_SIZE,
      quality: 'medium',
    }),
  })

  return parseImageResponse(res)
}

// Überarbeitet ein bestehendes Rahmendesign anhand einer Nutzeranweisung
// über den images/edits-Endpoint.
export async function refineFrame(
  apiKey: string,
  format: CardFormat,
  layout: CardLayout,
  imageDataUrl: string,
  instruction: string,
  side: CardSide,
): Promise<string> {
  const image = await fetch(imageDataUrl).then((r) => r.blob())

  const form = new FormData()
  form.append('model', 'gpt-image-1')
  form.append('image', image, `frame-${side}.png`)
  form.append('prompt', buildRefinePrompt(format, layout, instruction, side))
  form.append('size', IMAGE_SIZE)
  form.append('quality', 'medium')

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireKey(apiKey)}` },
    body: form,
  })

  return parseImageResponse(res)
}
