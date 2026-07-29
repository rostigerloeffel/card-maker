import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Plus, Send, Sparkles, Trash2 } from 'lucide-react'

import { CardFace, type CardValues } from '@/components/CardFace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { FORMATS } from '@/lib/formats'
import { LAYOUTS } from '@/lib/layouts'
import { generateFrame, loadApiKey, refineFrame, saveApiKey } from '@/lib/openai'
import { deriveTheme, type CardTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface CardEntry {
  id: string
  image?: string
  values: CardValues
}

function Step({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-medium tracking-tight">
        <span className="mr-2 text-muted-foreground/50 tabular-nums">{n}</span>
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function App() {
  const [formatId, setFormatId] = useState('poker')
  const [layoutId, setLayoutId] = useState('tcg')
  const [apiKey, setApiKey] = useState(loadApiKey)
  const [stylePrompt, setStylePrompt] = useState('')
  const [withBack, setWithBack] = useState(false)
  const [frames, setFrames] = useState<{ front?: string; back?: string }>({})
  const [theme, setTheme] = useState<CardTheme | null>(null)
  const [generating, setGenerating] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState('')
  const [refining, setRefining] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cards, setCards] = useState<CardEntry[]>([])

  const uploadRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const replaceCardId = useRef<string | null>(null)

  const format = FORMATS.find((f) => f.id === formatId) ?? FORMATS[0]
  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0]

  const hasApiKey = apiKey.trim().length > 0
  const busy = generating || refining

  function handleApiKeyChange(value: string) {
    setApiKey(value)
    saveApiKey(value.trim())
  }

  // Leitet Schrift und Farben aus dem neuen Rahmendesign ab; scheitert die
  // Ableitung, bleiben die Karten beim neutralen Standard-Erscheinungsbild.
  async function updateTheme(front: string | undefined, style: string) {
    if (!front) {
      setTheme(null)
      return
    }
    try {
      setTheme(await deriveTheme(apiKey, style, front, format, layout))
    } catch {
      setTheme(null)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const [front, back] = await Promise.all([
        generateFrame(apiKey, format, layout, stylePrompt, 'front'),
        withBack
          ? generateFrame(apiKey, format, layout, stylePrompt, 'back')
          : Promise.resolve(undefined),
      ])
      setFrames({ front, back })
      setHistory([stylePrompt.trim()])
      setRefinePrompt('')
      await updateTheme(front, stylePrompt)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  async function handleRefine() {
    const instruction = refinePrompt.trim()
    if (!instruction) return
    setRefining(true)
    setError(null)
    try {
      const [front, back] = await Promise.all([
        frames.front
          ? refineFrame(apiKey, format, layout, frames.front, instruction, 'front')
          : Promise.resolve(undefined),
        frames.back
          ? refineFrame(apiKey, format, layout, frames.back, instruction, 'back')
          : Promise.resolve(undefined),
      ])
      setFrames({ front: front ?? frames.front, back: back ?? frames.back })
      setHistory((prev) => [...prev, instruction])
      setRefinePrompt('')
      await updateTheme(front ?? frames.front, history[0] ?? stylePrompt)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRefining(false)
    }
  }

  function addCard(image?: string) {
    setCards((prev) => [...prev, { id: crypto.randomUUID(), image, values: {} }])
  }

  async function handleUpload(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      addCard(await readAsDataUrl(file))
    }
  }

  async function handleReplace(files: FileList | null) {
    const id = replaceCardId.current
    const file = files?.[0]
    if (!id || !file) return
    const image = await readAsDataUrl(file)
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, image } : c)))
  }

  function updateCard(id: string, key: string, value: string) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, values: { ...c.values, [key]: value } } : c)),
    )
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Sparkles className="size-7" />
          Card Maker
        </h1>
        <p className="text-muted-foreground">
          Eigene Spielkarten entwerfen: Format wählen, Layout festlegen, Rahmendesign
          generieren, Karten befüllen.
        </p>
      </header>

      <Separator />

      <section className="flex flex-col gap-5">
        <Step n={1} title="Format" hint="Die Vorschau entspricht den realen Proportionen." />
        <div className="flex flex-wrap items-end gap-6">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormatId(f.id)}
              className="group flex flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'rounded-md border-2 bg-card shadow-xs transition-colors',
                  f.id === formatId
                    ? 'border-primary'
                    : 'border-border group-hover:border-ring',
                )}
                style={{ width: f.widthMm * 1.4, aspectRatio: `${f.widthMm} / ${f.heightMm}` }}
              />
              <div className="text-sm font-medium">{f.name}</div>
              <div className="text-xs text-muted-foreground">
                {f.widthMm} × {f.heightMm} mm
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <Step n={2} title="Layout" hint="Bestimmt Felder und Aufteilung der Karte." />
        <div className="flex flex-wrap items-start gap-6">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLayoutId(l.id)}
              className={cn(
                'flex w-[118px] flex-col items-center gap-2 rounded-lg p-1 transition-colors',
                l.id === layoutId ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-ring/40',
              )}
            >
              <CardFace format={format} layout={l} width={110} />
              <div className="text-sm font-medium">{l.name}</div>
              <div className="text-center text-xs text-muted-foreground">{l.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <Step
          n={3}
          title="Rahmendesign"
          hint="Beschreibe den gewünschten Stil — daraus entsteht ein Rahmendesign für alle Karten."
        />
        <div className="flex max-w-xl flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="openai-token">OpenAI API-Token</Label>
            <Input
              id="openai-token"
              type="password"
              autoComplete="off"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Wird nur lokal in deinem Browser gespeichert und direkt an OpenAI gesendet.
            </p>
          </div>
          <Textarea
            rows={3}
            placeholder="z. B. dunkles Fantasy-Design mit goldenen Ornamenten und feiner Linienführung"
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
          />
          <Label className="flex items-center gap-2 text-sm font-normal">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={withBack}
              onChange={(e) => setWithBack(e.target.checked)}
            />
            Auch eine Rückseite erzeugen
          </Label>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={busy || !stylePrompt.trim() || !hasApiKey}
              className="self-start"
            >
              {generating && <Loader2 className="animate-spin" />}
              {frames.front ? 'Neu generieren' : 'Design generieren'}
            </Button>
            {!hasApiKey && (
              <span className="text-sm text-muted-foreground">
                Bitte zuerst ein OpenAI API-Token eingeben.
              </span>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        {(frames.front || frames.back) && (
          <div className="flex flex-wrap gap-6">
            {frames.front && (
              <figure className="flex flex-col items-center gap-2">
                <img
                  src={frames.front}
                  alt="Rahmendesign Vorderseite"
                  className="rounded-md border shadow-sm"
                  style={{ width: 220, aspectRatio: `${format.widthMm} / ${format.heightMm}`, objectFit: 'cover' }}
                />
                <figcaption className="text-xs text-muted-foreground">Vorderseite</figcaption>
              </figure>
            )}
            {frames.back && (
              <figure className="flex flex-col items-center gap-2">
                <img
                  src={frames.back}
                  alt="Rahmendesign Rückseite"
                  className="rounded-md border shadow-sm"
                  style={{ width: 220, aspectRatio: `${format.widthMm} / ${format.heightMm}`, objectFit: 'cover' }}
                />
                <figcaption className="text-xs text-muted-foreground">Rückseite</figcaption>
              </figure>
            )}
          </div>
        )}
        {(frames.front || frames.back) && (
          <div className="flex max-w-xl flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Design iterativ verbessern</h3>
              <p className="text-sm text-muted-foreground">
                Beschreibe, was am aktuellen Design geändert werden soll — es wird
                darauf aufbauend überarbeitet.
              </p>
            </div>
            {history.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {history.map((message, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
                  >
                    <span className="mr-2 font-medium text-foreground">
                      {i === 0 ? 'Stil' : `Änderung ${i}`}
                    </span>
                    {message}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-end gap-3">
              <Textarea
                rows={2}
                placeholder="z. B. die Ornamente feiner machen und in Silber statt Gold"
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    void handleRefine()
                  }
                }}
              />
              <Button
                onClick={handleRefine}
                disabled={busy || !refinePrompt.trim() || !hasApiKey}
              >
                {refining ? <Loader2 className="animate-spin" /> : <Send />}
                Senden
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <Step
          n={4}
          title="Karten"
          hint="Bilder hochladen oder leere Karten anlegen — alle Felder sind direkt auf der Karte editierbar."
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => uploadRef.current?.click()}>
            <ImagePlus />
            Bilder hochladen
          </Button>
          <Button variant="outline" onClick={() => addCard()}>
            <Plus />
            Leere Karte
          </Button>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void handleUpload(e.target.files)
              e.target.value = ''
            }}
          />
          <input
            ref={replaceRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void handleReplace(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Karten angelegt.</p>
        ) : (
          <div className="flex flex-wrap gap-6">
            {cards.map((card) => (
              <div key={card.id} className="group relative">
                <CardFace
                  format={format}
                  layout={layout}
                  width={250}
                  frameUrl={frames.front}
                  image={card.image}
                  values={card.values}
                  theme={frames.front ? theme : null}
                  onChange={(key, value) => updateCard(card.id, key, value)}
                  onPickImage={() => {
                    replaceCardId.current = card.id
                    replaceRef.current?.click()
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Karte löschen"
                  className="absolute -top-2 -right-2 size-7 rounded-full border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  onClick={() => setCards((prev) => prev.filter((c) => c.id !== card.id))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
