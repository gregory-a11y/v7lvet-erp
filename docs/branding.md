# V7LVET — Charte Graphique

## Description

V7LVET est un cabinet pluridisciplinaire en expertise comptable, audit et conseil financier.
Innovation, agilité et excellence sont les valeurs fondatrices.

## Palette de couleurs

| Nom           | Hex       | Usage                           |
|---------------|-----------|----------------------------------|
| Gris Perlé    | `#F4F5F3` | Background, surfaces claires    |
| Océan Profond | `#063238` | Texte principal, sidebar, foncé |
| Émeraude      | `#2E6965` | Primary, boutons, liens         |
| Améthyste     | `#6242FB` | Accent, CTA, highlights         |

### Couleurs dérivées

| Usage          | Hex       |
|----------------|-----------|
| Secondary bg   | `#E8EAE6` |
| Muted text     | `#4A6B6A` |
| Sidebar accent | `#0A4A52` |
| Border         | `#D4D6D2` |
| Destructive    | `#DC2626` |

## Typographies

| Usage       | Font        | Style        |
|-------------|-------------|--------------|
| Titres/Logo | **Cabin**   | Bold, CAPS   |
| Corps       | **Inter**   | Regular      |
| Code/Mono   | Geist Mono  | Regular      |

### Hiérarchie

- `h1-h6` : Cabin Bold, uppercase
- Body text : Inter Regular
- Sous-titres : Inter Light

## Logos

Les fichiers SVG sont dans `/public/logos/` :

- `logo-emeraude.svg` — Logo horizontal vert
- `logo-blanc.svg` — Logo horizontal blanc (pour fond sombre)
- `logo-complet-emeraude.svg` — Logo complet avec sous-titre
- `v7-emeraude.svg` — Lettermark V7
- `logo-gris-perle.svg` — Logo horizontal gris

### Règles d'utilisation

1. Respecter la zone de protection (largeur du E en Cabin)
2. Ne pas pivoter, déformer ou changer la composition
3. Utiliser uniquement les couleurs de la charte
4. Ne pas changer les typographies

## Design Tone

- **Style** : Corporate & professionnel
- **Mode** : Light only (pas de dark mode)
- **Border radius** : 0.5rem (8px)

## CSS Variables (Tailwind)

Les couleurs de la charte sont disponibles via des utility classes Tailwind :

- `bg-v7-emeraude` / `text-v7-emeraude` → `#2E6965`
- `bg-v7-ocean` / `text-v7-ocean` → `#063238`
- `bg-v7-perle` / `text-v7-perle` → `#F4F5F3`
- `bg-v7-amethyste` / `text-v7-amethyste` → `#6242FB`
