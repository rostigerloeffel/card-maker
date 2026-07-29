# Card Maker

Browser-only React-App zum Erstellen von Karten. Kein Backend, keine Persistenz —
der komplette State lebt im Browser.

**Live:** https://rostigerloeffel.github.io/card-maker/

## Stack

| Bereich       | Wahl                                        |
| ------------- | ------------------------------------------- |
| Build         | Vite 8                                      |
| UI            | React 19 + TypeScript                       |
| Styling       | Tailwind CSS v4 (`@tailwindcss/vite`)       |
| Komponenten   | shadcn/ui (new-york, Radix, Base Color: neutral) |
| Icons         | lucide-react                                |
| Linting       | Oxlint                                      |
| Deployment    | GitHub Actions → GitHub Pages               |

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build    # tsc -b && vite build → dist/
npm run preview
```

## shadcn/ui

`components.json` ist eingerichtet, weitere Komponenten lassen sich direkt
hinzufügen:

```bash
npx shadcn@latest add dialog select tabs
```

Komponenten landen in `src/components/ui/`, der Import-Alias `@/` zeigt auf `src/`.
Bereits enthalten: `button`, `card`, `input`, `label`, `separator`, `textarea`.

## Deployment

`.github/workflows/deploy.yml` baut bei jedem Push auf `main` und veröffentlicht
`dist/` über GitHub Pages. Damit das greift, muss in den Repo-Settings unter
**Settings → Pages → Build and deployment → Source** einmalig **GitHub Actions**
ausgewählt werden — nicht „Deploy from a branch“, sonst würde das Repo-Root
statt des Builds ausgeliefert. Automatisieren lässt sich dieser Schritt nicht:
das `GITHUB_TOKEN` darf die Pages-Site nicht selbst anlegen.

Der Base-Pfad wird über die Env-Variable `BASE_PATH` gesetzt (im Workflow auf
`/<repo-name>/`), lokal bleibt er `/`.
