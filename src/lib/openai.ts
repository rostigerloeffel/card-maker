import type { CardFormat } from './formats'
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

// Referenz-Prompt: übernimmt Format und Layout und beschreibt als Ziel ein
// reines Rahmendesign — ohne Text, Logos oder Beispielinhalte.
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
      `composition covering the whole card. Style: ${stylePrompt}`
    )
  }

  return (
    `${base} This is the card front: an ornamental border along the edges ` +
    `with calm, low-contrast inner surfaces so content placed on top stays ` +
    `readable. Keep these regions visually quiet: ${layout.frameHints}. ` +
    `Style: ${stylePrompt}`
  )
}

// Prompt für iterative Überarbeitungen: die Änderung des Nutzers plus die
// unverändert geltenden Grundregeln des Rahmendesigns.
export function buildRefinePrompt(instruction: string, side: CardSide): string {
  const target =
    side === 'back'
      ? 'the symmetric ornamental composition of this card back'
      : 'the ornamental frame of this card front, keeping the inner surfaces calm and low-contrast'
  return (
    `Revise ${target} according to this request: ${instruction}. ` +
    `Keep everything else as it is. Flat, print-ready illustration. ` +
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
      size: '1024x1536',
      quality: 'medium',
    }),
  })

  return parseImageResponse(res)
}

// Überarbeitet ein bestehendes Rahmendesign anhand einer Nutzeranweisung
// über den images/edits-Endpoint.
export async function refineFrame(
  apiKey: string,
  imageDataUrl: string,
  instruction: string,
  side: CardSide,
): Promise<string> {
  const image = await fetch(imageDataUrl).then((r) => r.blob())

  const form = new FormData()
  form.append('model', 'gpt-image-1')
  form.append('image', image, `frame-${side}.png`)
  form.append('prompt', buildRefinePrompt(instruction, side))
  form.append('size', '1024x1536')
  form.append('quality', 'medium')

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireKey(apiKey)}` },
    body: form,
  })

  return parseImageResponse(res)
}
