# Meta-Prompt — Module Settings (Administration)
> Priority: P2 | Depends on: 01-auth, 05-gates, 06-tickets, 07-documents, 09-equipe

## Context
Module hub d'administration de l'application, accessible exclusivement par l'Associe (admin). Cette page centralise toute la configuration de l'ERP : types de tickets, templates de gates, categories de documents, et un lien vers la gestion d'equipe (`/equipe`). Ce n'est pas un module avec sa propre logique metier lourde — c'est un orchestrateur qui s'appuie sur les fonctions Convex definies dans les modules 05 (Gates), 06 (Tickets) et 07 (Documents).

L'approche choisie est un hub avec des cartes de navigation vers des sous-pages dediees, chacune gerant le CRUD d'une entite de configuration via un pattern `ConfigTable` + `ConfigFormDialog` reutilisable.

Reference : `docs/prd.md#611-settings` et `docs/pages.md#14-settings`

## Stack
- Convex: queries, mutations (reutilise les fonctions des modules 05, 06, 07)
- shadcn/ui: Card, Table, Dialog, AlertDialog, Form, Input, Textarea, Badge, Button, Separator, Skeleton, Tabs
- react-hook-form + zod pour les formulaires
- Pas de bibliotheque externe supplementaire

## Auth & Permissions
- **Acces a `/settings` et toutes ses sous-pages** : role `associe` uniquement
- **Redirection** : si un user non-associe tente d'acceder a `/settings/*`, redirect vers `/dashboard`
- **CRUD sur les entites de config** (ticketTypes, gateTemplates, documentCategories) : `associe` uniquement
- Implementation via `RoleGuard` cote client + verification `hasMinRole(user.role, "associe")` cote Convex dans chaque mutation

```typescript
// Middleware de protection dans layout.tsx de /settings
// Verification cote client
const { data: session } = useSession()
if (session?.user?.role !== "associe") {
  redirect("/dashboard")
}
```

## Data Model
Tables concernees : `ticketTypes`, `gateTemplates`, `documentCategories` (definies dans `convex/schema.ts`)

### ticketTypes
```typescript
ticketTypes: defineTable({
  nom: v.string(),
  description: v.optional(v.string()),
  color: v.optional(v.string()), // Code couleur hex (ex: "#FF5722")
  status: v.optional(v.union(v.literal("actif"), v.literal("inactif"))),
}).index("by_nom", ["nom"])
```

### gateTemplates
```typescript
gateTemplates: defineTable({
  nom: v.string(),
  preuveAttendue: v.string(),
  escaladeRegle: v.optional(v.string()),
  order: v.number(), // Ordre d'application dans le run
}).index("by_nom", ["nom"])
```

### documentCategories
```typescript
documentCategories: defineTable({
  nom: v.string(),
  description: v.optional(v.string()),
  status: v.optional(v.union(v.literal("actif"), v.literal("inactif"))),
}).index("by_nom", ["nom"])
```

## Pages

### /settings — Hub d'administration
- **Fichier** : `app/(dashboard)/settings/page.tsx`
- **Layout group** : `(dashboard)`
- **Roles** : Associe uniquement
- **Layout** : grille de cartes (2 colonnes desktop, 1 colonne mobile) avec liens vers les sous-pages
- **Titre de page** : "Administration" avec icone `Settings`
- **Cartes** :

| Carte | Icone | Description | Lien | Badge |
|-------|-------|-------------|------|-------|
| Equipe | `UsersRound` | Gerer les membres du cabinet | `/equipe` | Nombre de membres actifs |
| Types de tickets | `Tag` | Configurer les types de tickets | `/settings/ticket-types` | Nombre de types actifs |
| Templates de gates | `ShieldCheck` | Configurer les modeles de gates | `/settings/gate-templates` | Nombre de templates |
| Categories de documents | `FolderOpen` | Configurer les categories de classement | `/settings/document-categories` | Nombre de categories actives |

- **Loading** : 4 `Skeleton` cards
- **Composant** : `SettingsHub`

---

### /settings/ticket-types — Gestion des types de tickets
- **Fichier** : `app/(dashboard)/settings/ticket-types/page.tsx`
- **Roles** : Associe uniquement
- **Data source** : `useQuery(api.ticketTypes.list)`
- **Layout** : `PageHeader` avec breadcrumb (Administration > Types de tickets) + `ConfigTable`

#### Tableau

| Colonne | Type | Description |
|---------|------|-------------|
| Nom | string | Nom du type de ticket |
| Description | string | Description courte (optionnelle) |
| Couleur | color badge | Preview de la couleur associee |
| Status | badge | `actif` (vert) ou `inactif` (gris) |
| Actions | dropdown | Modifier, Desactiver/Activer |

- **Tri par defaut** : nom ASC
- **Actions globales** : bouton "Ajouter un type" → ouvre `ConfigFormDialog`
- **Actions ligne** : dropdown avec Modifier (ouvre dialog pre-rempli), Desactiver/Activer (toggle status)
- **Pas de suppression** si le type est utilise par au moins un ticket existant → le bouton est remplace par "Desactiver"

#### Dialog creation/edition

| Champ | Type | Obligatoire | Validation |
|-------|------|-------------|------------|
| Nom | `Input` text | oui | min 2 chars, unique parmi les types actifs |
| Description | `Textarea` | non | max 200 chars |
| Couleur | Color picker (Input type="color" ou palette predefinies) | non | format hex valide |

- **On submit create** : `useMutation(api.ticketTypes.create)` → toast "Type de ticket cree" → ferme dialog
- **On submit edit** : `useMutation(api.ticketTypes.update)` → toast "Type de ticket modifie" → ferme dialog
- **Erreur doublon** : toast "Un type avec ce nom existe deja"

#### Types par defaut (seeding)
Ces types sont crees a l'initialisation et ne peuvent pas etre supprimes, uniquement desactives :
- `Demande d'information` — `#3B82F6` (bleu)
- `Anomalie comptable` — `#EF4444` (rouge)
- `Relance client` — `#F59E0B` (ambre)
- `Hors perimetre` — `#6B7280` (gris)
- `Arbitrage` — `#8B5CF6` (violet)

---

### /settings/gate-templates — Gestion des templates de gates
- **Fichier** : `app/(dashboard)/settings/gate-templates/page.tsx`
- **Roles** : Associe uniquement
- **Data source** : `useQuery(api.gateTemplates.list)`
- **Layout** : `PageHeader` avec breadcrumb (Administration > Templates de gates) + `ConfigTable`

#### Tableau

| Colonne | Type | Description |
|---------|------|-------------|
| Ordre | number | Position d'application dans le run (reorderable) |
| Nom | string | Nom du template de gate |
| Preuve attendue | string | Description de la preuve requise |
| Regle d'escalade | string | Regle en cas de blocage (optionnel) |
| Actions | dropdown | Modifier, Supprimer, Monter/Descendre |

- **Tri par defaut** : `order` ASC
- **Reordonner** : boutons fleche haut/bas dans la colonne Ordre, ou input numerique dans le dialog d'edition. Chaque changement d'ordre declenche `useMutation(api.gateTemplates.reorder)` qui recalcule les ordres de tous les templates.
- **Actions globales** : bouton "Ajouter un template"
- **Actions ligne** : Modifier (dialog), Supprimer (AlertDialog de confirmation)
- **Suppression autorisee** : les templates ne sont pas directement lies aux gates existantes (les gates sont des copies). On peut donc supprimer un template sans impact sur les gates deja creees.

#### Dialog creation/edition

| Champ | Type | Obligatoire | Validation |
|-------|------|-------------|------------|
| Nom | `Input` text | oui | min 2 chars |
| Preuve attendue | `Textarea` | oui | min 5 chars |
| Regle d'escalade | `Textarea` | non | max 500 chars |
| Ordre | `Input` number | oui | entier >= 1, auto-incremente par defaut |

- **On submit create** : `useMutation(api.gateTemplates.create)` → toast "Template de gate cree"
- **On submit edit** : `useMutation(api.gateTemplates.update)` → toast "Template modifie"
- **On delete** : `useMutation(api.gateTemplates.delete)` → AlertDialog "Supprimer ce template ? Les gates existantes ne seront pas affectees." → toast "Template supprime"

---

### /settings/document-categories — Gestion des categories de documents
- **Fichier** : `app/(dashboard)/settings/document-categories/page.tsx`
- **Roles** : Associe uniquement
- **Data source** : `useQuery(api.documentCategories.list)`
- **Layout** : `PageHeader` avec breadcrumb (Administration > Categories de documents) + `ConfigTable`

#### Tableau

| Colonne | Type | Description |
|---------|------|-------------|
| Nom | string | Nom de la categorie |
| Description | string | Description courte (optionnelle) |
| Status | badge | `actif` (vert) ou `inactif` (gris) |
| Actions | dropdown | Modifier, Desactiver/Activer |

- **Tri par defaut** : nom ASC
- **Actions globales** : bouton "Ajouter une categorie"
- **Actions ligne** : Modifier (dialog), Desactiver/Activer (toggle)
- **Pas de suppression** si la categorie est utilisee par au moins un document → "Desactiver" uniquement

#### Dialog creation/edition

| Champ | Type | Obligatoire | Validation |
|-------|------|-------------|------------|
| Nom | `Input` text | oui | min 2 chars, unique parmi les categories actives |
| Description | `Textarea` | non | max 200 chars |

- **On submit create** : `useMutation(api.documentCategories.create)` → toast "Categorie creee"
- **On submit edit** : `useMutation(api.documentCategories.update)` → toast "Categorie modifiee"

#### Categories par defaut (seeding)
- `Bilan`
- `Liasse fiscale`
- `Declaration TVA`
- `Contrat`
- `Facture`
- `Courrier`
- `Piece justificative`
- `Autre`

## Convex Functions
Les fonctions CRUD sont definies dans les modules 05, 06 et 07. Ce module les reutilise directement. Si elles n'existent pas encore, les creer avec les signatures suivantes.

### ticketTypes (module 06)
```typescript
// convex/ticketTypes.ts

// Query — Liste tous les types de tickets
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("ticketTypes").collect()
  },
})

// Mutation — Creer un type de ticket
export const create = mutation({
  args: {
    nom: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    // Verifier unicite du nom
    const existing = await ctx.db
      .query("ticketTypes")
      .withIndex("by_nom", (q) => q.eq("nom", args.nom))
      .first()
    if (existing) throw new ConvexError("Un type avec ce nom existe deja")
    return await ctx.db.insert("ticketTypes", { ...args })
  },
})

// Mutation — Modifier un type de ticket
export const update = mutation({
  args: {
    id: v.id("ticketTypes"),
    nom: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    const { id, ...fields } = args
    await ctx.db.patch(id, fields)
  },
})

// Mutation — Supprimer un type de ticket (seulement si non utilise)
export const remove = mutation({
  args: { id: v.id("ticketTypes") },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    const ticketType = await ctx.db.get(args.id)
    if (!ticketType) throw new ConvexError("Type introuvable")
    // Verifier qu'aucun ticket n'utilise ce type
    const usedBy = await ctx.db
      .query("tickets")
      .withIndex("by_type", (q) => q.eq("type", ticketType.nom))
      .first()
    if (usedBy) throw new ConvexError("Ce type est utilise par des tickets existants")
    await ctx.db.delete(args.id)
  },
})
```

### gateTemplates (module 05)
```typescript
// convex/gateTemplates.ts

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("gateTemplates").collect()
    // Trier par order cote client ou ajouter un index
  },
})

export const create = mutation({
  args: {
    nom: v.string(),
    preuveAttendue: v.string(),
    escaladeRegle: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    return await ctx.db.insert("gateTemplates", args)
  },
})

export const update = mutation({
  args: {
    id: v.id("gateTemplates"),
    nom: v.optional(v.string()),
    preuveAttendue: v.optional(v.string()),
    escaladeRegle: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    const { id, ...fields } = args
    await ctx.db.patch(id, fields)
  },
})

export const remove = mutation({
  args: { id: v.id("gateTemplates") },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    await ctx.db.delete(args.id)
  },
})

// Reordonner les templates (recu: liste ordonnee d'IDs)
export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("gateTemplates")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { order: i + 1 })
    }
  },
})
```

### documentCategories (module 07)
```typescript
// convex/documentCategories.ts

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("documentCategories").collect()
  },
})

export const create = mutation({
  args: {
    nom: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    const existing = await ctx.db
      .query("documentCategories")
      .withIndex("by_nom", (q) => q.eq("nom", args.nom))
      .first()
    if (existing) throw new ConvexError("Une categorie avec ce nom existe deja")
    return await ctx.db.insert("documentCategories", args)
  },
})

export const update = mutation({
  args: {
    id: v.id("documentCategories"),
    nom: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    const { id, ...fields } = args
    await ctx.db.patch(id, fields)
  },
})

export const remove = mutation({
  args: { id: v.id("documentCategories") },
  handler: async (ctx, args) => {
    await assertRole(ctx, "associe")
    const category = await ctx.db.get(args.id)
    if (!category) throw new ConvexError("Categorie introuvable")
    const usedBy = await ctx.db
      .query("documents")
      .withIndex("by_categorie", (q) => q.eq("categorieId", args.id))
      .first()
    if (usedBy) throw new ConvexError("Cette categorie est utilisee par des documents existants")
    await ctx.db.delete(args.id)
  },
})
```

### Helpers partages
```typescript
// convex/lib/auth.ts (ou existant)

async function assertRole(ctx: MutationCtx, requiredRole: UserRole) {
  const user = await getCurrentUser(ctx)
  if (!user) throw new ConvexError("Non authentifie")
  if (!hasMinRole(user.role, requiredRole)) {
    throw new ConvexError("Permissions insuffisantes")
  }
  return user
}
```

## UI Components

### SettingsHub
- **Fichier** : `components/settings/settings-hub.tsx`
- Grille de `Card` cliquables (2 colonnes desktop, 1 mobile)
- Chaque carte : icone, titre, description, badge compteur, fleche de navigation
- Hover : border emeraude V7LVET + ombre legere
- Utilise `Link` de `next/link` pour chaque carte

```tsx
function SettingsHub() {
  const ticketTypes = useQuery(api.ticketTypes.list)
  const gateTemplates = useQuery(api.gateTemplates.list)
  const docCategories = useQuery(api.documentCategories.list)

  const cards = [
    {
      title: "Equipe",
      description: "Gerer les membres du cabinet",
      href: "/equipe",
      icon: UsersRound,
      count: null, // charge depuis le module equipe
    },
    {
      title: "Types de tickets",
      description: "Configurer les types de tickets",
      href: "/settings/ticket-types",
      icon: Tag,
      count: ticketTypes?.length,
    },
    {
      title: "Templates de gates",
      description: "Configurer les modeles de points de controle",
      href: "/settings/gate-templates",
      icon: ShieldCheck,
      count: gateTemplates?.length,
    },
    {
      title: "Categories de documents",
      description: "Configurer les categories de classement",
      href: "/settings/document-categories",
      icon: FolderOpen,
      count: docCategories?.length,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => (
        <SettingsCard key={card.href} {...card} />
      ))}
    </div>
  )
}
```

### ConfigTable (composant reutilisable)
- **Fichier** : `components/settings/config-table.tsx`
- Table generique pour afficher et gerer une entite de configuration
- Props :

```typescript
interface ConfigTableProps<T> {
  data: T[] | undefined
  columns: ColumnDef<T>[]
  onAdd: () => void
  addLabel: string
  emptyMessage: string
  isLoading: boolean
}
```

- Affiche un bouton "Ajouter" en haut a droite
- Loading : `Skeleton` table (5 rows)
- Empty : message + CTA "Ajouter"
- Chaque ligne a un dropdown d'actions (Modifier, Supprimer/Desactiver)

### ConfigFormDialog (composant reutilisable)
- **Fichier** : `components/settings/config-form-dialog.tsx`
- Dialog generique pour creer/editer une entite de configuration
- Props :

```typescript
interface ConfigFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode // Contenu du formulaire
  onSubmit: () => void
  isSubmitting: boolean
  submitLabel?: string // defaut: "Enregistrer"
}
```

- Mode creation : formulaire vide, titre "Ajouter un [type]"
- Mode edition : formulaire pre-rempli, titre "Modifier [nom]"
- Boutons : Annuler + Enregistrer (avec loading state)
- Fermeture automatique apres succes

### SettingsPageLayout
- **Fichier** : `components/settings/settings-page-layout.tsx`
- Layout reutilisable pour les sous-pages settings
- Inclut : breadcrumb (Administration > [Sous-page]), titre, bouton retour

```tsx
interface SettingsPageLayoutProps {
  title: string
  breadcrumb: string
  children: React.ReactNode
}
```

## Zod Schemas

```typescript
// lib/validations/settings.ts

import { z } from "zod"

export const ticketTypeSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  description: z.string().max(200).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Format couleur invalide")
    .optional(),
})

export const gateTemplateSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  preuveAttendue: z.string().min(5, "La preuve attendue doit contenir au moins 5 caracteres"),
  escaladeRegle: z.string().max(500).optional(),
  order: z.number().int().min(1, "L'ordre doit etre >= 1"),
})

export const documentCategorySchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  description: z.string().max(200).optional(),
})
```

## User Stories

### US-1: Naviguer dans le hub d'administration
En tant qu'associe, je veux acceder a un hub centralise pour configurer l'application.
- [ ] La page `/settings` affiche 4 cartes de navigation
- [ ] Chaque carte affiche un compteur (nombre d'elements actifs)
- [ ] Un clic sur une carte redirige vers la sous-page correspondante
- [ ] La carte "Equipe" redirige vers `/equipe` (module existant)
- [ ] Les cartes ont un hover state avec la couleur emeraude V7LVET
- [ ] Un utilisateur non-associe est redirige vers `/dashboard`

### US-2: Gerer les types de tickets
En tant qu'associe, je veux creer, modifier et desactiver des types de tickets.
- [ ] La page affiche un tableau avec tous les types (actifs et inactifs)
- [ ] Je peux ajouter un nouveau type avec nom, description et couleur
- [ ] Je peux modifier un type existant via un dialog pre-rempli
- [ ] Je peux desactiver un type (il ne sera plus proposable dans la creation de ticket)
- [ ] Je ne peux pas supprimer un type utilise par des tickets existants
- [ ] Un badge couleur preview la couleur choisie dans le tableau
- [ ] Toast de confirmation apres chaque action
- [ ] Les types par defaut ne peuvent pas etre supprimes, uniquement desactives

### US-3: Gerer les templates de gates
En tant qu'associe, je veux configurer des templates de gates reutilisables pour standardiser les controles.
- [ ] La page affiche un tableau ordonne par position (order)
- [ ] Je peux ajouter un template avec nom, preuve attendue, regle d'escalade et ordre
- [ ] Je peux modifier un template existant
- [ ] Je peux supprimer un template (les gates deja creees a partir de ce template ne sont pas affectees)
- [ ] Je peux reordonner les templates via les boutons fleche haut/bas
- [ ] L'ordre est automatiquement recalcule apres chaque reordonnement
- [ ] Toast de confirmation apres chaque action

### US-4: Gerer les categories de documents
En tant qu'associe, je veux configurer les categories pour classer les documents.
- [ ] La page affiche un tableau avec toutes les categories (actives et inactives)
- [ ] Je peux ajouter une categorie avec nom et description
- [ ] Je peux modifier une categorie existante
- [ ] Je peux desactiver une categorie (elle ne sera plus proposee dans les formulaires d'upload)
- [ ] Je ne peux pas supprimer une categorie utilisee par des documents existants
- [ ] Toast de confirmation apres chaque action
- [ ] Les categories par defaut ne peuvent pas etre supprimees, uniquement desactivees

## Edge Cases

### Protection contre la suppression d'elements utilises
- **Type de ticket utilise** : si un `ticketType` est reference par au moins un ticket, la suppression est impossible. Le bouton "Supprimer" est remplace par "Desactiver". Un tooltip explique : "Ce type est utilise par X ticket(s). Vous pouvez le desactiver."
- **Categorie de document utilisee** : meme logique pour les `documentCategories` referencees par des documents.

### Reordonnement des templates de gates
- Apres un move up/down, tous les ordres sont recalcules sequentiellement (1, 2, 3...) via la mutation `gateTemplates.reorder`
- Si deux templates ont le meme ordre (donnee corrompue), le recalcul les corrige automatiquement
- Le premier template ne peut pas monter, le dernier ne peut pas descendre (boutons disabled)

### Protection du dernier admin
- Ce module ne gere pas directement les users, mais le lien vers `/equipe` oui. Le module equipe (09) doit gerer le cas ou l'associe tente de se supprimer ou de changer son propre role.

### Unicite des noms
- Les noms de types de tickets et de categories de documents doivent etre uniques. La verification se fait cote Convex (mutation) et cote client (validation zod + message d'erreur dans le dialog).

### Elements par defaut
- Les types de tickets et categories de documents par defaut (seedes a l'initialisation) sont marques avec un flag `isDefault: true` dans la base. Ils ne peuvent pas etre supprimes, uniquement desactives.
- Pour le MVP, ce flag peut etre gere via une convention (nom dans une liste hardcodee) plutot qu'un champ en base.

### Etat vide
- Chaque sous-page affiche un etat vide specifique avec un CTA :
  - Types de tickets : "Aucun type de ticket configure. Ajoutez votre premier type."
  - Templates de gates : "Aucun template de gate configure. Ajoutez votre premier template."
  - Categories de documents : "Aucune categorie configuree. Ajoutez votre premiere categorie."

### Erreur reseau
- Chaque sous-page gere les erreurs de chargement avec un message "Erreur de chargement" + bouton "Reessayer"
- Les mutations en erreur affichent un toast rouge avec le message d'erreur Convex

## Arborescence des fichiers

```
app/(dashboard)/settings/
  page.tsx                          # Hub — SettingsHub
  layout.tsx                        # RoleGuard associe + breadcrumb
  ticket-types/
    page.tsx                        # Table + CRUD ticket types
  gate-templates/
    page.tsx                        # Table + CRUD gate templates
  document-categories/
    page.tsx                        # Table + CRUD document categories

components/settings/
  settings-hub.tsx                  # Grille de cartes
  settings-card.tsx                 # Carte individuelle du hub
  settings-page-layout.tsx          # Layout reutilisable sous-pages
  config-table.tsx                  # Table generique CRUD
  config-form-dialog.tsx            # Dialog generique create/edit

lib/validations/
  settings.ts                       # Zod schemas

convex/
  ticketTypes.ts                    # list, create, update, remove
  gateTemplates.ts                  # list, create, update, remove, reorder
  documentCategories.ts             # list, create, update, remove
```

## Commit
```
feat: implement admin settings hub (ticket types + gate templates + document categories)
```
