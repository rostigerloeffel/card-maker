export interface CardLayout {
  id: string
  name: string
  description: string
  // Beschreibt die freizuhaltenden Bereiche für den Bildgenerierungs-Prompt.
  frameHints: string
}

export const LAYOUTS: CardLayout[] = [
  {
    id: 'classic',
    name: 'Spielkarte',
    description: 'Eckzeichen und großes Motiv',
    frameHints:
      'small corner indices in the top-left and bottom-right corners and one large central artwork area',
  },
  {
    id: 'tcg',
    name: 'Trading Card',
    description: 'Name, Bild, Typ, Regeltext',
    frameHints:
      'a name bar at the top, a large artwork window in the upper half, a thin type line below it and a text box in the lower third',
  },
  {
    id: 'monster',
    name: 'Monster',
    description: 'Name, KP, Bild, zwei Attacken',
    frameHints:
      'a name bar with hit points at the top, a large artwork window in the middle and two ability text areas in the lower half',
  },
  {
    id: 'quartett',
    name: 'Quartett',
    description: 'Titel, Bild, Wertetabelle',
    frameHints:
      'a centered title at the top, an artwork window in the upper half and a four-row value table in the lower half',
  },
  {
    id: 'tarot',
    name: 'Tarot',
    description: 'Numeral, großes Motiv, Titelzeile',
    frameHints:
      'a small numeral at the top, a dominant central artwork area and a centered name plate at the bottom',
  },
  {
    id: 'profile',
    name: 'Porträt',
    description: 'Bild, Name, Kurzbeschreibung',
    frameHints:
      'a large portrait area in the upper two thirds, a name line below it and a short description area at the bottom',
  },
]
