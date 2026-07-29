export interface CardFormat {
  id: string
  name: string
  widthMm: number
  heightMm: number
  note: string
}

// Gängige physische Kartenformate, Maße in Millimetern.
export const FORMATS: CardFormat[] = [
  { id: 'bridge', name: 'Bridge', widthMm: 57, heightMm: 89, note: 'Schmales Standardformat' },
  { id: 'skat', name: 'Skat', widthMm: 59, heightMm: 91, note: 'Deutsches Turnierformat' },
  { id: 'tcg', name: 'TCG', widthMm: 63, heightMm: 88, note: 'MTG, Pokémon u. a.' },
  { id: 'poker', name: 'Poker', widthMm: 63.5, heightMm: 88.9, note: 'Internationales Standardformat' },
  { id: 'tarot', name: 'Tarot', widthMm: 70, heightMm: 120, note: 'Großes Format' },
]
