import type { CSSProperties } from 'react'

import { Image as ImageIcon } from 'lucide-react'

import type { CardFormat } from '@/lib/formats'
import type { CardLayout, TextRegion } from '@/lib/layouts'
import type { CardTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export type CardValues = Record<string, string>

interface CardFaceProps {
  format: CardFormat
  layout: CardLayout
  width: number
  frameUrl?: string | null
  image?: string | null
  values?: CardValues
  // Aus dem Rahmendesign abgeleitete Schrift und Farben der Felder.
  theme?: CardTheme | null
  // Ohne onChange rendert die Karte als statische Vorschau (Schema-Ansicht).
  onChange?: (key: string, value: string) => void
  onPickImage?: () => void
}

interface FieldProps {
  region: TextRegion
  values: CardValues
  themed: boolean
  onChange?: (key: string, value: string) => void
}

function Field({ region, values, themed, onChange }: FieldProps) {
  const value = values[region.key] ?? ''

  if (!onChange) {
    return (
      <span
        className={cn(
          'block truncate',
          themed ? 'text-(--card-ink-soft)' : 'text-muted-foreground/70',
          region.className,
        )}
      >
        {value || region.placeholder}
      </span>
    )
  }

  const shared = cn(
    'w-full rounded-[0.25em] px-[0.35em] outline-none',
    themed
      ? 'bg-(--card-panel) text-(--card-ink) placeholder:text-(--card-ink-soft) focus:bg-(--card-panel-focus)'
      : 'bg-background/65 placeholder:text-muted-foreground/60 focus:bg-background/90',
    region.className,
  )

  if (region.multiline) {
    return (
      <textarea
        className={cn(shared, 'h-full resize-none py-[0.25em] leading-snug')}
        value={value}
        placeholder={region.placeholder}
        onChange={(e) => onChange(region.key, e.target.value)}
      />
    )
  }
  return (
    <input
      className={cn(shared, 'h-full')}
      value={value}
      placeholder={region.placeholder}
      onChange={(e) => onChange(region.key, e.target.value)}
    />
  )
}

interface ArtProps {
  image?: string | null
  onPickImage?: () => void
}

function Art({ image, onPickImage }: ArtProps) {
  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden rounded-[0.4em] bg-muted/60',
        onPickImage && 'cursor-pointer',
        onPickImage && !image && 'border border-dashed border-muted-foreground/40',
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
  theme,
  onChange,
  onPickImage,
}: CardFaceProps) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[4.5%] border bg-card shadow-sm"
      style={
        {
          width,
          aspectRatio: `${format.widthMm} / ${format.heightMm}`,
          fontSize: width / 15,
          ...(theme && {
            fontFamily: theme.fontFamily,
            '--card-ink': theme.ink,
            '--card-ink-soft': theme.inkSoft,
            '--card-panel': theme.panel,
            '--card-panel-focus': theme.panelFocus,
          }),
        } as CSSProperties
      }
    >
      {frameUrl && (
        <img src={frameUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="relative h-full">
        {layout.regions.map((region, i) => (
          <div
            key={`${region.key}-${i}`}
            className={cn('absolute', region.kind === 'text' && region.rotate && 'rotate-180')}
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.w}%`,
              height: `${region.h}%`,
            }}
          >
            {region.kind === 'art' ? (
              <Art image={image} onPickImage={onPickImage} />
            ) : (
              <Field region={region} values={values} themed={!!theme} onChange={onChange} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
