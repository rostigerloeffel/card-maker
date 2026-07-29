import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const initialCard = {
  title: 'Neue Karte',
  subtitle: 'Untertitel',
  body: 'Beschreibe hier, was auf der Karte stehen soll.',
}

function App() {
  const [card, setCard] = useState(initialCard)

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Sparkles className="size-7" />
          Card Maker
        </h1>
        <p className="text-muted-foreground">
          React + TypeScript + Vite + Tailwind + shadcn/ui. Alles läuft im
          Browser, nichts wird gespeichert.
        </p>
      </header>

      <Separator />

      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={card.title}
              onChange={(e) => setCard({ ...card, title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="subtitle">Untertitel</Label>
            <Input
              id="subtitle"
              value={card.subtitle}
              onChange={(e) => setCard({ ...card, subtitle: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="body">Text</Label>
            <Textarea
              id="body"
              rows={5}
              value={card.body}
              onChange={(e) => setCard({ ...card, body: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            className="self-start"
            onClick={() => setCard(initialCard)}
          >
            Zurücksetzen
          </Button>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>{card.title || 'Ohne Titel'}</CardTitle>
              <CardDescription>{card.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{card.body}</p>
            </CardContent>
            <CardFooter>
              <span className="text-muted-foreground text-xs">Vorschau</span>
            </CardFooter>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default App
