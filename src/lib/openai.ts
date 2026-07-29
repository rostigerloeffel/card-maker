import type { CardFormat } from './formats'
import type { CardLayout } from './layouts'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY

export const hasApiKey = Boolean(apiKey)

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

export async function generateFrame(
  format: CardFormat,
  layout: CardLayout,
  stylePrompt: string,
  side: CardSide,
): Promise<string> {
  if (!apiKey) {
    throw new Error('Kein API-Token konfiguriert (VITE_OPENAI_API_KEY).')
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: buildFramePrompt(format, layout, stylePrompt, side),
      size: '1024x1536',
      quality: 'medium',
    }),
  })

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
