import type { CardFormat } from './formats'
import { cropWindow } from './geometry'
import type { CardLayout } from './layouts'

// Aus dem generierten Rahmendesign abgeleitete Typografie und Farben, damit
// die eingefügten Inhalte wie aus einem Guss mit dem Design wirken.
export interface CardTheme {
  // CSS-Schriftstapel für alle Kartenfelder.
  fontFamily: string
  // Textfarbe mit gutem Kontrast zu den Inhaltszonen.
  ink: string
  // Abgeschwächte Textfarbe für Platzhalter.
  inkSoft: string
  // Feldhintergrund im Farbton der Inhaltszonen (Ruhe- und Fokuszustand).
  panel: string
  panelFocus: string
}

interface FontOption {
  family: string
  // Kurzbeschreibung für die Schriftwahl durch das Sprachmodell.
  vibe: string
  stack: string
}

const FONT_OPTIONS: FontOption[] = [
  { family: 'Cinzel', vibe: 'elegant Roman capitals, classic fantasy, antique', stack: "'Cinzel', serif" },
  { family: 'Cormorant Garamond', vibe: 'refined old-style serif, baroque, romantic', stack: "'Cormorant Garamond', serif" },
  { family: 'Uncial Antiqua', vibe: 'medieval uncial script, celtic, ancient', stack: "'Uncial Antiqua', serif" },
  { family: 'Pirata One', vibe: 'blackletter, gothic, dark and grim', stack: "'Pirata One', serif" },
  { family: 'Almendra', vibe: 'storybook fantasy serif, fairy tale', stack: "'Almendra', serif" },
  { family: 'Rye', vibe: 'western, wanted poster, rustic', stack: "'Rye', serif" },
  { family: 'Special Elite', vibe: 'typewriter, noir, detective, vintage', stack: "'Special Elite', monospace" },
  { family: 'Orbitron', vibe: 'geometric sci-fi, futuristic, technological', stack: "'Orbitron', sans-serif" },
  { family: 'Audiowide', vibe: 'techno, racing, neon, cyberpunk', stack: "'Audiowide', sans-serif" },
  { family: 'Exo 2', vibe: 'modern technical sans-serif, clean sci-fi', stack: "'Exo 2', sans-serif" },
  { family: 'Bangers', vibe: 'comic book, cartoon, playful action', stack: "'Bangers', sans-serif" },
  { family: 'Amatic SC', vibe: 'hand-drawn, whimsical, light-hearted', stack: "'Amatic SC', sans-serif" },
  { family: 'Caveat', vibe: 'casual handwriting, personal, warm', stack: "'Caveat', cursive" },
  { family: 'Merriweather', vibe: 'sturdy readable serif, traditional, neutral', stack: "'Merriweather', serif" },
  { family: 'Inter', vibe: 'clean modern sans-serif, minimalist, neutral', stack: "'Inter', sans-serif" },
]

const DEFAULT_FONT = FONT_OPTIONS.find((f) => f.family === 'Inter')!

const loadedFonts = new Set<string>()

// Lädt die Schrift einmalig über Google Fonts nach.
function ensureFontLoaded(family: string) {
  if (loadedFonts.has(family)) return
  loadedFonts.add(family)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`
  document.head.appendChild(link)
}

// Lässt das Sprachmodell eine zum Stil passende Schrift aus der kuratierten
// Liste wählen; bei Fehlern fällt die Wahl auf die neutrale Standardschrift.
async function pickFont(apiKey: string, stylePrompt: string): Promise<FontOption> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content:
              `A playing card frame design was generated from this style description: ` +
              `"${stylePrompt}". Pick the font that best matches this style from the ` +
              `following list:\n` +
              FONT_OPTIONS.map((f) => `- ${f.family}: ${f.vibe}`).join('\n') +
              `\nAnswer only with JSON: {"font": "<family name from the list>"}`,
          },
        ],
      }),
    })
    if (!res.ok) return DEFAULT_FONT
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}') as { font?: string }
    return FONT_OPTIONS.find((f) => f.family === parsed.font) ?? DEFAULT_FONT
  } catch {
    return DEFAULT_FONT
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Rahmendesign konnte nicht geladen werden.'))
    img.src = src
  })
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
const rgb = (r: number, g: number, b: number) => `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`
const rgba = (r: number, g: number, b: number, a: number) =>
  `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${a})`

// Mittelt die Farbe der Textzonen des Layouts im generierten Rahmendesign
// und leitet daraus Feldhintergrund und kontrastreiche Textfarbe ab.
async function extractZoneColors(
  frameUrl: string,
  format: CardFormat,
  layout: CardLayout,
): Promise<Pick<CardTheme, 'ink' | 'inkSoft' | 'panel' | 'panelFocus'>> {
  const img = await loadImage(frameUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar.')
  ctx.drawImage(img, 0, 0)

  const crop = cropWindow(format)
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (const region of layout.regions) {
    if (region.kind !== 'text') continue
    const x = Math.round((crop.left + (region.x / 100) * crop.width) * canvas.width)
    const y = Math.round((crop.top + (region.y / 100) * crop.height) * canvas.height)
    const w = Math.max(1, Math.round((region.w / 100) * crop.width * canvas.width))
    const h = Math.max(1, Math.round((region.h / 100) * crop.height * canvas.height))
    const data = ctx.getImageData(x, y, w, h).data
    // Grobes Raster genügt für einen Durchschnittston.
    for (let i = 0; i < data.length; i += 4 * 16) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      n++
    }
  }
  if (n === 0) throw new Error('Keine Textzonen im Layout.')
  r /= n
  g /= n
  b /= n

  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  // Heller Untergrund → dunkle Tinte im gleichen Farbton, und umgekehrt.
  const ink =
    luminance > 0.5
      ? rgb(r * 0.22, g * 0.22, b * 0.22)
      : rgb(r + (255 - r) * 0.88, g + (255 - g) * 0.88, b + (255 - b) * 0.88)
  const inkSoft =
    luminance > 0.5
      ? rgba(r * 0.22, g * 0.22, b * 0.22, 0.55)
      : rgba(r + (255 - r) * 0.88, g + (255 - g) * 0.88, b + (255 - b) * 0.88, 0.55)

  return {
    ink,
    inkSoft,
    panel: rgba(r, g, b, 0.45),
    panelFocus: rgba(r, g, b, 0.8),
  }
}

// Leitet das komplette Karten-Theme aus Stilbeschreibung und generiertem
// Rahmendesign ab: Schrift per Sprachmodell, Farben per Pixel-Sampling.
export async function deriveTheme(
  apiKey: string,
  stylePrompt: string,
  frameUrl: string,
  format: CardFormat,
  layout: CardLayout,
): Promise<CardTheme> {
  const [font, colors] = await Promise.all([
    pickFont(apiKey, stylePrompt),
    extractZoneColors(frameUrl, format, layout),
  ])
  ensureFontLoaded(font.family)
  return { fontFamily: font.stack, ...colors }
}
