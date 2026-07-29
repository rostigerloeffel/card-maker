// Ein Layout wird durch seine Regionen definiert: Rechtecke in Prozent der
// Kartenfläche (x/y = linke obere Ecke, w/h = Größe). Dieselben Regionen
// steuern sowohl den Karteneditor (CardFace) als auch den Prompt der
// Bildgenerierung — Design und Inhalte teilen sich damit eine Geometrie.

interface LayoutRegionBase {
  key: string
  // Englische Bezeichnung für den Bildgenerierungs-Prompt. Regionen mit
  // gleichem Label werden im Prompt zu einer Zone zusammengefasst.
  label: string
  x: number
  y: number
  w: number
  h: number
}

export interface ArtRegion extends LayoutRegionBase {
  kind: 'art'
}

export interface TextRegion extends LayoutRegionBase {
  kind: 'text'
  placeholder: string
  multiline?: boolean
  // Typografie als Daten, damit Karteneditor und PDF-Export identisch
  // rendern: Größe in em relativ zur Kartengrundschrift, Laufweite in em.
  size?: number
  align?: 'left' | 'center' | 'right'
  weight?: 'normal' | 'medium' | 'semibold'
  tracking?: number
  // 180° gedreht (unteres Eckzeichen einer Spielkarte).
  rotate?: boolean
}

export type LayoutRegion = ArtRegion | TextRegion

export interface CardLayout {
  id: string
  name: string
  description: string
  regions: LayoutRegion[]
}

export const LAYOUTS: CardLayout[] = [
  {
    id: 'classic',
    name: 'Spielkarte',
    description: 'Eckzeichen und großes Motiv',
    regions: [
      {
        kind: 'text',
        key: 'index',
        label: 'small corner index',
        x: 5,
        y: 4,
        w: 16,
        h: 7,
        placeholder: 'A♠',
        align: 'center',
        weight: 'semibold',
      },
      { kind: 'art', key: 'art', label: 'large central artwork window', x: 10, y: 14, w: 80, h: 72 },
      {
        kind: 'text',
        key: 'index',
        label: 'small corner index',
        x: 79,
        y: 89,
        w: 16,
        h: 7,
        placeholder: 'A♠',
        align: 'center',
        weight: 'semibold',
        rotate: true,
      },
    ],
  },
  {
    id: 'tcg',
    name: 'Trading Card',
    description: 'Name, Bild, Typ, Regeltext',
    regions: [
      {
        kind: 'text',
        key: 'name',
        label: 'name bar',
        x: 6,
        y: 5,
        w: 88,
        h: 7,
        placeholder: 'Name',
        weight: 'semibold',
      },
      { kind: 'art', key: 'art', label: 'main artwork window', x: 6, y: 14.5, w: 88, h: 42 },
      {
        kind: 'text',
        key: 'type',
        label: 'thin type line',
        x: 6,
        y: 59,
        w: 88,
        h: 5,
        placeholder: 'Typ — Untertyp',
        size: 0.72,
      },
      {
        kind: 'text',
        key: 'text',
        label: 'rules text box',
        x: 6,
        y: 66.5,
        w: 88,
        h: 28,
        placeholder: 'Regeltext oder Beschreibung',
        multiline: true,
        size: 0.68,
      },
    ],
  },
  {
    id: 'monster',
    name: 'Monster',
    description: 'Name, KP, Bild, zwei Attacken',
    regions: [
      {
        kind: 'text',
        key: 'name',
        label: 'name bar',
        x: 6,
        y: 5,
        w: 60,
        h: 7,
        placeholder: 'Name',
        weight: 'semibold',
      },
      {
        kind: 'text',
        key: 'hp',
        label: 'hit points box',
        x: 68,
        y: 5,
        w: 26,
        h: 7,
        placeholder: '60 KP',
        size: 0.72,
        align: 'right',
        weight: 'medium',
      },
      { kind: 'art', key: 'art', label: 'main artwork window', x: 6, y: 14.5, w: 88, h: 38 },
      {
        kind: 'text',
        key: 'attack1',
        label: 'ability text area',
        x: 6,
        y: 55.5,
        w: 88,
        h: 18,
        placeholder: 'Erste Attacke',
        multiline: true,
        size: 0.66,
      },
      {
        kind: 'text',
        key: 'attack2',
        label: 'ability text area',
        x: 6,
        y: 76,
        w: 88,
        h: 18,
        placeholder: 'Zweite Attacke',
        multiline: true,
        size: 0.66,
      },
    ],
  },
  {
    id: 'quartett',
    name: 'Quartett',
    description: 'Titel, Bild, Wertetabelle',
    regions: [
      {
        kind: 'text',
        key: 'title',
        label: 'centered title bar',
        x: 6,
        y: 5,
        w: 88,
        h: 7,
        placeholder: 'Titel',
        align: 'center',
        weight: 'semibold',
      },
      { kind: 'art', key: 'art', label: 'artwork window', x: 6, y: 14.5, w: 88, h: 41 },
      ...[1, 2, 3, 4].flatMap<LayoutRegion>((i) => [
        {
          kind: 'text',
          key: `stat${i}`,
          label: 'four-row value table',
          x: 6,
          y: 58.5 + (i - 1) * 9,
          w: 58,
          h: 7.5,
          placeholder: `Eigenschaft ${i}`,
          size: 0.66,
        },
        {
          kind: 'text',
          key: `value${i}`,
          label: 'four-row value table',
          x: 66,
          y: 58.5 + (i - 1) * 9,
          w: 28,
          h: 7.5,
          placeholder: '–',
          size: 0.66,
          align: 'right',
        },
      ]),
    ],
  },
  {
    id: 'tarot',
    name: 'Tarot',
    description: 'Numeral, großes Motiv, Titelzeile',
    regions: [
      {
        kind: 'text',
        key: 'numeral',
        label: 'small numeral plate',
        x: 35,
        y: 5,
        w: 30,
        h: 6,
        placeholder: 'XXI',
        size: 0.72,
        align: 'center',
        tracking: 0.2,
      },
      { kind: 'art', key: 'art', label: 'dominant central artwork area', x: 7, y: 13, w: 86, h: 73 },
      {
        kind: 'text',
        key: 'name',
        label: 'centered name plate',
        x: 7,
        y: 88.5,
        w: 86,
        h: 7,
        placeholder: 'Die Welt',
        align: 'center',
        weight: 'medium',
        tracking: 0.025,
      },
    ],
  },
  {
    id: 'profile',
    name: 'Porträt',
    description: 'Bild, Name, Kurzbeschreibung',
    regions: [
      { kind: 'art', key: 'art', label: 'large portrait area', x: 6, y: 5, w: 88, h: 55 },
      {
        kind: 'text',
        key: 'name',
        label: 'name line',
        x: 6,
        y: 62.5,
        w: 88,
        h: 7,
        placeholder: 'Name',
        weight: 'semibold',
      },
      {
        kind: 'text',
        key: 'text',
        label: 'short description area',
        x: 6,
        y: 72,
        w: 88,
        h: 23,
        placeholder: 'Kurzbeschreibung',
        multiline: true,
        size: 0.68,
      },
    ],
  },
]
