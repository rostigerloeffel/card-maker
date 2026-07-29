import { Image as ImageIcon } from 'lucide-react'

import type { CardFormat } from '@/lib/formats'
import type { CardLayout } from '@/lib/layouts'
import { cn } from '@/lib/utils'

export type CardValues = Record<string, string>

interface CardFaceProps {
  format: CardFormat
  layout: CardLayout
  width: number
  frameUrl?: string | null
  image?: string | null
  values?: CardValues
  // Ohne onChange rendert die Karte als statische Vorschau (Schema-Ansicht).
  onChange?: (key: string, value: string) => void
  onPickImage?: () => void
}

interface FieldProps {
  k: string
  placeholder: string
  multiline?: boolean
  className?: string
  values: CardValues
  onChange?: (key: string, value: string) => void
}

function Field({ k, placeholder, multiline, className, values, onChange }: FieldProps) {
  const value = values[k] ?? ''

  if (!onChange) {
    return (
      <span className={cn('block truncate text-muted-foreground/70', className)}>
        {value || placeholder}
      </span>
    )
  }

  const shared = cn(
    'w-full rounded-[0.25em] bg-background/65 px-[0.35em] outline-none',
    'placeholder:text-muted-foreground/60 focus:bg-background/90',
    className,
  )

  if (multiline) {
    return (
      <textarea
        className={cn(shared, 'h-full resize-none py-[0.25em] leading-snug')}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(k, e.target.value)}
      />
    )
  }
  return (
    <input
      className={shared}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(k, e.target.value)}
    />
  )
}

interface ArtProps {
  image?: string | null
  onPickImage?: () => void
  className?: string
}

function Art({ image, onPickImage, className }: ArtProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[0.4em] bg-muted/60',
        onPickImage && 'cursor-pointer',
        onPickImage && !image && 'border border-dashed border-muted-foreground/40',
        className,
      )}
      onClick={onPickImage}
    >
      {image ? (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
          <ImageIcon className="size-[1.6em]" />
        </div>
      )}
    </div>
  )
}

export function CardFace({
  format,
  layout,
  width,
  frameUrl,
  image,
  values = {},
  onChange,
  onPickImage,
}: CardFaceProps) {
  const field = (k: string, placeholder: string, opts?: Partial<FieldProps>) => (
    <Field k={k} placeholder={placeholder} values={values} onChange={onChange} {...opts} />
  )
  const art = (className: string) => (
    <Art image={image} onPickImage={onPickImage} className={className} />
  )

  let body
  switch (layout.id) {
    case 'classic':
      body = (
        <div className="flex h-full flex-col p-[5%]">
          <div className="w-[2.4em]">
            {field('index', 'A♠', { className: 'text-center font-semibold' })}
          </div>
          {art('mx-[6%] my-[3%] flex-1')}
          <div className="w-[2.4em] rotate-180 self-end">
            {field('index', 'A♠', { className: 'text-center font-semibold' })}
          </div>
        </div>
      )
      break
    case 'tcg':
      body = (
        <div className="flex h-full flex-col gap-[3%] p-[6%]">
          {field('name', 'Name', { className: 'font-semibold' })}
          {art('flex-[5]')}
          {field('type', 'Typ — Untertyp', { className: 'text-[0.72em]' })}
          <div className="flex-[3]">
            {field('text', 'Regeltext oder Beschreibung', {
              multiline: true,
              className: 'text-[0.68em]',
            })}
          </div>
        </div>
      )
      break
    case 'monster':
      body = (
        <div className="flex h-full flex-col gap-[3%] p-[6%]">
          <div className="flex items-baseline gap-[0.4em]">
            <div className="min-w-0 flex-1">{field('name', 'Name', { className: 'font-semibold' })}</div>
            <div className="w-[3.4em]">
              {field('hp', '60 KP', { className: 'text-right text-[0.72em] font-medium' })}
            </div>
          </div>
          {art('flex-[4]')}
          <div className="flex-[2]">
            {field('attack1', 'Erste Attacke', { multiline: true, className: 'text-[0.66em]' })}
          </div>
          <div className="flex-[2]">
            {field('attack2', 'Zweite Attacke', { multiline: true, className: 'text-[0.66em]' })}
          </div>
        </div>
      )
      break
    case 'quartett':
      body = (
        <div className="flex h-full flex-col gap-[3%] p-[6%]">
          {field('title', 'Titel', { className: 'text-center font-semibold' })}
          {art('flex-1')}
          <div className="flex flex-col gap-[0.3em] text-[0.66em]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-[0.4em]">
                <div className="min-w-0 flex-1">{field(`stat${i}`, `Eigenschaft ${i}`)}</div>
                <div className="w-[4em]">
                  {field(`value${i}`, '–', { className: 'text-right' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
      break
    case 'tarot':
      body = (
        <div className="flex h-full flex-col gap-[3%] p-[7%]">
          <div className="mx-auto w-[4em]">
            {field('numeral', 'XXI', { className: 'text-center text-[0.72em] tracking-[0.2em]' })}
          </div>
          {art('flex-1')}
          {field('name', 'Die Welt', { className: 'text-center font-medium tracking-wide' })}
        </div>
      )
      break
    default:
      body = (
        <div className="flex h-full flex-col gap-[3%] p-[6%]">
          {art('flex-[4]')}
          {field('name', 'Name', { className: 'font-semibold' })}
          <div className="flex-[2]">
            {field('text', 'Kurzbeschreibung', { multiline: true, className: 'text-[0.68em]' })}
          </div>
        </div>
      )
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[4.5%] border bg-card shadow-sm"
      style={{
        width,
        aspectRatio: `${format.widthMm} / ${format.heightMm}`,
        fontSize: width / 15,
      }}
    >
      {frameUrl && (
        <img src={frameUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="relative h-full">{body}</div>
    </div>
  )
}
