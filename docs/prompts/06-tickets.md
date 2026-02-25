# Meta-Prompt — Module Tickets
> Priority: P1 | Depends on: 00-schema, 01-auth, 02-clients

## Context
Le module Tickets gere les anomalies, exceptions et demandes hors perimetre liees a un client du cabinet. Un ticket peut signaler un ecart comptable, une piece manquante, une relance client, ou toute situation qui sort du flux normal de production.

Les tickets sont essentiels pour :
- **Tracabilite** : garder un historique complet des incidents et demandes exceptionnelles par client.
- **Refacturation** : identifier les travaux hors perimetre qui doivent etre refactures au client.
- **Pilotage** : permettre aux managers et associes de suivre les points de friction et la charge supplementaire.
- **Communication interne** : formaliser les remontees entre collaborateurs, managers et associes.

Les types de tickets (ticketTypes) sont entierement configurables par l'admin depuis l'interface. Ils ne sont pas hardcodes dans le code. Exemples : "Anomalie comptable", "Piece manquante", "Demande client", "Relance", "Hors perimetre facturable".

Un ticket est toujours rattache a un client. Il peut optionnellement etre lie a un run (exercice fiscal) ou a une tache specifique pour contextualiser l'anomalie.

## Stack
- Convex: queries, mutations
- shadcn/ui: Table, Card, Dialog, Form, Input, Select, Textarea, Badge, Separator, Skeleton, AlertDialog, DropdownMenu, Tabs
- react-hook-form + zod pour les formulaires
- Pas de bibliotheque externe supplementaire

## Data Model
Tables concernees : `tickets`, `ticketTypes`

### tickets
```typescript
tickets: defineTable({
  // Relations
  clientId: v.id("clients"),
  runId: v.optional(v.id("runs")),
  tacheId: v.optional(v.id("taches")),
  ticketTypeId: v.optional(v.id("ticketTypes")),

  // Contenu
  titre: v.string(),
  description: v.optional(v.string()),

  // Classification
  priorite: v.union(
    v.literal("basse"),
    v.literal("normale"),
    v.literal("haute"),
    v.literal("urgente"),
  ),
  status: v.union(
    v.literal("ouvert"),
    v.literal("en_cours"),
    v.literal("resolu"),
    v.literal("ferme"),
  ),

  // Assignation
  assigneId: v.optional(v.id("users")),
  createdBy: v.id("users"),

  // Resolution
  resolution: v.optional(v.string()), // Texte expliquant comment le ticket a ete resolu
  resolvedAt: v.optional(v.number()), // Timestamp de la resolution

  // Meta
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_client", ["clientId"])
  .index("by_status", ["status"])
  .index("by_assigne", ["assigneId"])
  .index("by_type", ["ticketTypeId"])
```

### ticketTypes
```typescript
ticketTypes: defineTable({
  nom: v.string(),
  description: v.optional(v.string()),
  couleur: v.optional(v.string()), // Code hex (ex: "#FF5722")
  icone: v.optional(v.string()),   // Nom d'icone Lucide (ex: "AlertTriangle")
  isActive: v.boolean(),
  createdAt: v.number(),
})
  .index("by_nom", ["nom"])
```

### Notes sur le schema
- `ticketTypeId` est optionnel pour rester compatible avec le schema-draft existant qui utilise `type: v.string()` comme reference libre. En migration, on pourra passer a un lien strict `v.id("ticketTypes")`.
- `priorite` utilise "urgente" au lieu de "critique" du schema-draft pour correspondre au vocabulaire metier du cabinet (basse, normale, haute, urgente).
- `createdBy` remplace `createdById` du schema-draft pour rester coherent avec la convention de nommage des autres modules.
- `resolution` et `updatedAt` sont ajoutes par rapport au schema-draft pour supporter le flow de resolution complet.

## Auth & Permissions

### Cascade de visibilite (lecture)
| Role | Perimetre visible |
|---|---|
| associe | Tous les tickets de tous les clients |
| manager | Tickets des clients de son portefeuille (client.managerId === userId) |
| collaborateur | Tickets des clients dont il a un dossier assigne (dossier.collaborateurId === userId) |
| assistante | Tickets qui lui sont assignes uniquement (ticket.assigneId === userId) |

### Actions par role
| Action | associe | manager | collaborateur | assistante |
|---|---|---|---|---|
| Creer un ticket | Tous clients | Ses clients | Ses clients (via dossier) | Non |
| Voir un ticket | Tous | Ses clients | Ses clients (via dossier) | Ses tickets assignes |
| Modifier un ticket | Tous | Ses clients | Ses tickets crees/assignes | Ses tickets assignes |
| Assigner un ticket | Tous | Son equipe | Non | Non |
| Changer la priorite | Oui | Oui | Non | Non |
| Resoudre un ticket | Tous | Ses clients | Ses tickets assignes | Ses tickets assignes |
| Fermer un ticket | Tous | Ses clients | Non | Non |
| Supprimer un ticket | Oui | Non | Non | Non |
| Gerer les ticketTypes | Oui | Non | Non | Non |

## Pages

### /tickets — Liste des tickets
- **Layout group** : (dashboard)
- **Components** : PageHeader, DataTable (shadcn Table), Badge, filtres, DropdownMenu (actions)
- **Data source** : `useQuery(api.tickets.list)`
- **Filtres** :
  - Par status : ouvert, en_cours, resolu, ferme (multi-select)
  - Par priorite : basse, normale, haute, urgente
  - Par type : liste dynamique depuis ticketTypes
  - Par client : select avec recherche
  - Par assigne : select utilisateurs (manager/associe uniquement)
- **Tri** : par defaut createdAt DESC, options : priorite, status, client
- **Colonnes** : Titre, Client, Type (badge couleur), Priorite (badge), Status (badge), Assigne, Cree le
- **Actions ligne** : Voir, Modifier, Assigner, Resoudre (si ouvert/en_cours)
- **Bouton** : "Nouveau ticket" (selon permissions)
- **Loading** : Skeleton table (8 rows)
- **Empty** : "Aucun ticket. Tout roule !" avec illustration ou icone check
- **Responsive** : table scrollable horizontalement sur mobile, version cards sur < 640px

### /tickets/[id] — Detail d'un ticket
- **Layout group** : (dashboard)
- **Components** : PageHeader avec breadcrumb (Tickets > #titre), Card, Badge, Separator
- **Sections** :
  1. **En-tete** : titre, badges (status, priorite, type avec couleur), date de creation
  2. **Informations** : client (lien cliquable), run (lien si present), tache (lien si presente), assigne (avatar + nom), createur
  3. **Description** : texte complet du ticket
  4. **Resolution** : si status === "resolu" ou "ferme", afficher le texte de resolution et la date
  5. **Actions** :
     - Bouton "Prendre en charge" → passe en_cours + assigneId = currentUser
     - Bouton "Resoudre" → ouvre Dialog avec champ resolution (texte obligatoire)
     - Bouton "Fermer" → AlertDialog de confirmation (manager/associe)
     - Bouton "Rouvrir" → repasse en ouvert (si resolu/ferme, associe/manager)
     - Bouton "Modifier" → Dialog d'edition
     - Bouton "Supprimer" → AlertDialog (associe uniquement)
- **Loading** : Skeleton card
- **404** : "Ticket introuvable" si id invalide ou pas de permission

### /settings/ticket-types — Gestion des types de tickets
- **Layout group** : (dashboard) > settings
- **Auth** : associe uniquement (redirect si autre role)
- **Components** : PageHeader, Card, Dialog, Form, Table
- **Vue** : liste des ticketTypes avec nom, description, couleur (pastille), icone, statut actif/inactif
- **Actions** :
  - "Ajouter un type" → Dialog avec formulaire
  - Modifier → Dialog pre-rempli
  - Desactiver/Activer → toggle (pas de suppression hard si des tickets utilisent ce type)
  - Supprimer → uniquement si aucun ticket n'utilise ce type (sinon message d'erreur)
- **Formulaire ticketType** :
  - nom (obligatoire, unique)
  - description (optionnel)
  - couleur (color picker ou input hex, defaut "#6B7280")
  - icone (select parmi une liste d'icones Lucide predefinies, optionnel)
  - isActive (toggle, defaut true)

## Convex Functions

### Queries

#### `tickets.list`
Liste paginee des tickets visibles par l'utilisateur courant.
```typescript
// Auth: logged in
// Filtre par role cascade (voir section Auth & Permissions)
// Params:
args: {
  status?: v.optional(v.string()),        // "ouvert" | "en_cours" | "resolu" | "ferme"
  priorite?: v.optional(v.string()),      // "basse" | "normale" | "haute" | "urgente"
  ticketTypeId?: v.optional(v.id("ticketTypes")),
  clientId?: v.optional(v.id("clients")),
  assigneId?: v.optional(v.id("users")),
}
// Returns: Ticket[] enrichi avec clientName, ticketTypeName, ticketTypeColor, assigneName
// Tri: createdAt DESC par defaut
```

#### `tickets.getById`
Detail complet d'un ticket.
```typescript
// Auth: permission de voir ce ticket (via cascade client)
args: {
  id: v.id("tickets"),
}
// Returns: Ticket complet + client (raisonSociale), run (exercice), tache (nom),
//          assigne (name), createdByName, ticketType (nom, couleur, icone)
```

#### `tickets.listByClient`
Tickets d'un client specifique (utilise dans l'onglet Tickets de la fiche client).
```typescript
args: {
  clientId: v.id("clients"),
}
// Returns: Ticket[] avec ticketTypeName, priorite, status
```

#### `ticketTypes.list`
Liste de tous les types de tickets.
```typescript
// Auth: logged in
// Params:
args: {
  activeOnly?: v.optional(v.boolean()), // defaut false
}
// Returns: TicketType[]
// Note: pour les formulaires de creation de ticket, appeler avec activeOnly=true
```

### Mutations

#### `tickets.create`
Creer un nouveau ticket.
```typescript
// Auth: associe/manager/collaborateur (selon permissions client)
args: {
  clientId: v.id("clients"),
  runId: v.optional(v.id("runs")),
  tacheId: v.optional(v.id("taches")),
  ticketTypeId: v.optional(v.id("ticketTypes")),
  titre: v.string(),
  description: v.optional(v.string()),
  priorite: v.string(), // "basse" | "normale" | "haute" | "urgente"
  assigneId: v.optional(v.id("users")),
}
// Sets: status="ouvert", createdBy=currentUserId, createdAt=Date.now(), updatedAt=Date.now()
// Side effect: creer une notification pour l'assigne (si fourni)
// Side effect: creer une notification pour le manager du client
// Returns: ticketId
```

#### `tickets.update`
Modifier un ticket existant (titre, description, priorite, type, assignation).
```typescript
// Auth: voir tableau permissions
args: {
  id: v.id("tickets"),
  titre?: v.optional(v.string()),
  description?: v.optional(v.string()),
  priorite?: v.optional(v.string()),
  ticketTypeId?: v.optional(v.id("ticketTypes")),
  assigneId?: v.optional(v.id("users")),
}
// Sets: updatedAt=Date.now()
// Side effect: si assigneId change, notifier le nouvel assigne
```

#### `tickets.resolve`
Resoudre un ticket (passer en status "resolu" avec un texte de resolution).
```typescript
// Auth: assigne du ticket, manager du client, ou associe
args: {
  id: v.id("tickets"),
  resolution: v.string(), // Texte obligatoire
}
// Sets: status="resolu", resolution, resolvedAt=Date.now(), updatedAt=Date.now()
// Validation: le ticket doit etre en status "ouvert" ou "en_cours"
// Side effect: notifier le createur du ticket
```

#### `tickets.close`
Fermer un ticket (confirmation definitive apres resolution, ou fermeture directe).
```typescript
// Auth: manager du client ou associe
args: {
  id: v.id("tickets"),
}
// Sets: status="ferme", updatedAt=Date.now()
// Si pas encore resolu: sets resolvedAt=Date.now() aussi
```

#### `tickets.reopen`
Rouvrir un ticket resolu ou ferme.
```typescript
// Auth: manager du client ou associe
args: {
  id: v.id("tickets"),
}
// Sets: status="ouvert", resolution=undefined, resolvedAt=undefined, updatedAt=Date.now()
// Validation: le ticket doit etre en status "resolu" ou "ferme"
```

#### `tickets.remove`
Supprimer definitivement un ticket.
```typescript
// Auth: associe uniquement
args: {
  id: v.id("tickets"),
}
// Hard delete du document
```

#### `ticketTypes.create`
Creer un nouveau type de ticket.
```typescript
// Auth: associe uniquement
args: {
  nom: v.string(),
  description: v.optional(v.string()),
  couleur: v.optional(v.string()),
  icone: v.optional(v.string()),
}
// Sets: isActive=true, createdAt=Date.now()
// Validation: nom unique (verifier qu'aucun ticketType avec le meme nom n'existe)
// Returns: ticketTypeId
```

#### `ticketTypes.update`
Modifier un type de ticket existant.
```typescript
// Auth: associe uniquement
args: {
  id: v.id("ticketTypes"),
  nom?: v.optional(v.string()),
  description?: v.optional(v.string()),
  couleur?: v.optional(v.string()),
  icone?: v.optional(v.string()),
  isActive?: v.optional(v.boolean()),
}
// Validation: si nom change, verifier unicite
```

#### `ticketTypes.remove`
Supprimer un type de ticket.
```typescript
// Auth: associe uniquement
args: {
  id: v.id("ticketTypes"),
}
// Validation: verifier qu'aucun ticket n'utilise ce ticketTypeId
// Si des tickets existent avec ce type → throw ConvexError("Ce type est utilise par X ticket(s). Desactivez-le plutot.")
```

## UI Components

### TicketList
- Table principale de la page /tickets
- Colonnes : Titre, Client, Type (Badge avec couleur dynamique), Priorite (Badge), Status (Badge), Assigne (Avatar + nom), Date
- Clic sur une ligne → navigate vers /tickets/[id]
- Actions par ligne via DropdownMenu : Voir, Modifier, Assigner, Resoudre, Fermer
- Responsive : bascule en TicketCard sur mobile (< 640px)

### TicketCard
- Version carte d'un ticket pour mobile et pour l'onglet Tickets de la fiche client
- Affiche : titre, client, badges (type couleur, priorite, status), assigne, date relative ("il y a 2h")
- Clic → navigate vers /tickets/[id]
- Bordure gauche coloree selon priorite :
  - basse : gris (`border-l-gray-400`)
  - normale : bleu (`border-l-blue-500`)
  - haute : orange (`border-l-orange-500`)
  - urgente : rouge (`border-l-red-500`)

### TicketForm
- Formulaire de creation/edition d'un ticket
- Utilise dans un Dialog (creation depuis /tickets ou depuis la fiche client)
- Champs :
  - `titre` : Input text (obligatoire, min 3 caracteres)
  - `description` : Textarea (optionnel)
  - `clientId` : Select avec recherche (obligatoire, pre-rempli si ouvert depuis fiche client)
  - `ticketTypeId` : Select (liste des ticketTypes actifs, optionnel)
  - `priorite` : Select (basse, normale, haute, urgente — defaut "normale")
  - `runId` : Select conditionnel (runs du client selectionne, optionnel)
  - `tacheId` : Select conditionnel (taches du run selectionne, optionnel)
  - `assigneId` : Select utilisateurs (optionnel, visible manager/associe uniquement)
- Validation zod :
```typescript
const ticketFormSchema = z.object({
  titre: z.string().min(3, "Le titre doit contenir au moins 3 caracteres"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Le client est obligatoire"),
  ticketTypeId: z.string().optional(),
  priorite: z.enum(["basse", "normale", "haute", "urgente"]),
  runId: z.string().optional(),
  tacheId: z.string().optional(),
  assigneId: z.string().optional(),
})
```
- Comportement dynamique :
  - Quand clientId change → recharger la liste des runs du client
  - Quand runId change → recharger la liste des taches du run
  - Si runId est vide → cacher le champ tacheId

### TicketResolveDialog
- Dialog modale pour resoudre un ticket
- Champ unique : `resolution` (Textarea, obligatoire, min 10 caracteres)
- Placeholder : "Decrivez comment ce ticket a ete resolu..."
- Boutons : "Annuler" / "Marquer comme resolu"
- Validation : le champ resolution ne peut pas etre vide

### TicketStatusBadge
- Composant Badge reutilisable pour afficher le status d'un ticket
- Couleurs :
  - `ouvert` : bleu (`bg-blue-100 text-blue-800`)
  - `en_cours` : jaune (`bg-amber-100 text-amber-800`)
  - `resolu` : vert (`bg-green-100 text-green-800`)
  - `ferme` : gris (`bg-gray-100 text-gray-800`)

### TicketPrioriteBadge
- Composant Badge reutilisable pour afficher la priorite
- Variantes :
  - `basse` : outline gris
  - `normale` : outline bleu
  - `haute` : solid orange
  - `urgente` : solid rouge + icone AlertTriangle

### TicketTypeManager
- Composant complet pour /settings/ticket-types
- Liste des types sous forme de table avec pastille couleur
- Dialog de creation/edition inline
- Toggle actif/inactif avec Switch
- Bouton supprimer avec verification des dependances
- Formulaire inline :
  - nom : Input (obligatoire)
  - description : Input (optionnel)
  - couleur : Input hex avec apercu pastille coloree (ou color picker simple)
  - icone : Select parmi une liste predefinies d'icones Lucide : AlertTriangle, FileWarning, HelpCircle, MessageSquare, Clock, Ban, Flag, Zap, Bug, Inbox
  - isActive : Switch

## Zod Schemas (fichier `lib/validators/tickets.ts`)
```typescript
import { z } from "zod"

export const ticketFormSchema = z.object({
  titre: z.string().min(3, "Le titre doit contenir au moins 3 caracteres"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Le client est obligatoire"),
  ticketTypeId: z.string().optional(),
  priorite: z.enum(["basse", "normale", "haute", "urgente"]),
  runId: z.string().optional(),
  tacheId: z.string().optional(),
  assigneId: z.string().optional(),
})

export const ticketResolveSchema = z.object({
  resolution: z.string().min(10, "La resolution doit contenir au moins 10 caracteres"),
})

export const ticketTypeFormSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  description: z.string().optional(),
  couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format couleur invalide").optional(),
  icone: z.string().optional(),
})
```

## User Stories

### US-1: Creer un ticket pour un client
En tant que collaborateur, je veux signaler une anomalie ou une demande hors perimetre pour un de mes clients.
- [ ] Bouton "Nouveau ticket" visible sur la page /tickets et dans l'onglet Tickets de la fiche client
- [ ] Le formulaire permet de selectionner un client, un type, une priorite
- [ ] Le champ client est pre-rempli si je viens de la fiche client
- [ ] Je peux optionnellement lier le ticket a un run et/ou une tache
- [ ] Apres creation, je suis redirige vers le detail du ticket
- [ ] Un toast confirme la creation
- [ ] Le manager du client recoit une notification

### US-2: Suivre et filtrer les tickets
En tant que manager, je veux voir tous les tickets de mon portefeuille et les filtrer.
- [ ] La page /tickets affiche tous les tickets de mes clients
- [ ] Je peux filtrer par status, priorite, type, client, assigne
- [ ] Les tickets urgents sont visuellement distincts (badge rouge)
- [ ] Le compteur de tickets par status est affiche en haut de page
- [ ] Le tri par defaut est par date de creation decroissante
- [ ] Je peux trier par priorite pour voir les urgences en premier

### US-3: Resoudre un ticket
En tant que collaborateur assigne, je veux resoudre un ticket en documentant la resolution.
- [ ] Bouton "Prendre en charge" pour passer le ticket en_cours et m'assigner
- [ ] Bouton "Resoudre" ouvre un dialog avec un champ texte obligatoire
- [ ] Le texte de resolution est enregistre et visible dans le detail du ticket
- [ ] La date de resolution est enregistree automatiquement
- [ ] Le createur du ticket recoit une notification
- [ ] Le status passe a "resolu"

### US-4: Configurer les types de tickets
En tant qu'associe, je veux configurer les categories de tickets disponibles.
- [ ] Page /settings/ticket-types accessible uniquement aux associes
- [ ] Je peux creer un type avec nom, description, couleur et icone
- [ ] Je peux modifier un type existant
- [ ] Je peux desactiver un type (il n'apparait plus dans les formulaires mais les tickets existants gardent le type)
- [ ] Je peux supprimer un type uniquement s'il n'est utilise par aucun ticket
- [ ] Les types desactives sont visuellement distincts dans la liste (texte grise, badge "Inactif")

## Edge Cases
- **Ticket sans type** : ticketTypeId est optionnel. Si non renseigne, afficher "Non categorise" en gris dans la liste.
- **TicketType supprime/desactive** : les tickets existants avec ce type gardent la reference. Afficher le nom du type meme s'il est inactif. Si le ticketType est hard-delete (cas edge apres verification), afficher "Type supprime" en italique.
- **Ticket sans assigne** : afficher "Non assigne" avec un bouton rapide "Prendre en charge" pour le user courant.
- **Client archive avec tickets ouverts** : ne pas empecher l'archivage, mais afficher un warning "Ce client a X ticket(s) ouvert(s)" dans l'AlertDialog d'archivage (module clients).
- **Resoudre un ticket deja resolu** : le bouton Resoudre n'est visible que si status === "ouvert" ou "en_cours".
- **Fermer un ticket non resolu** : autorise (manager/associe). Le champ resolvedAt est rempli au moment de la fermeture. Pas de texte de resolution oblige dans ce cas.
- **Rouvrir un ticket ferme** : remet status="ouvert", efface resolution et resolvedAt. Seul manager/associe peut rouvrir.
- **Collaborateur cree un ticket puis perd l'acces au client** (dossier reassigne) : le ticket reste visible pour le createur dans sa liste tant qu'il est ouvert, mais il ne peut plus en creer de nouveau pour ce client.
- **Ticket lie a un run supprime** : le champ runId devient orphelin. Afficher "Run supprime" en italique dans le detail. Ne pas bloquer l'affichage du ticket.
- **Ticket lie a une tache supprimee** : meme logique que pour le run orphelin.
- **Nom de ticketType en doublon** : la mutation ticketTypes.create verifie l'unicite. Message d'erreur : "Un type avec ce nom existe deja."
- **Priorite modifiee** : seuls manager et associe peuvent changer la priorite. Un collaborateur ne peut pas escalader un ticket a "urgente" par lui-meme.
- **Notification en cascade** : la creation d'un ticket urgente doit notifier l'assigne ET le manager du client ET l'associe.

## Structure des fichiers
```
app/(dashboard)/tickets/
  page.tsx                    # Liste des tickets
  [id]/
    page.tsx                  # Detail d'un ticket

app/(dashboard)/settings/
  ticket-types/
    page.tsx                  # Gestion des types de tickets

components/tickets/
  ticket-list.tsx             # TicketList (table)
  ticket-card.tsx             # TicketCard (version mobile/embed)
  ticket-form.tsx             # TicketForm (creation/edition)
  ticket-resolve-dialog.tsx   # TicketResolveDialog
  ticket-status-badge.tsx     # TicketStatusBadge
  ticket-priorite-badge.tsx   # TicketPrioriteBadge
  ticket-type-manager.tsx     # TicketTypeManager (settings page)
  ticket-filters.tsx          # TicketFilters (barre de filtres)

convex/
  tickets.ts                  # Queries + Mutations tickets
  ticketTypes.ts              # Queries + Mutations ticketTypes

lib/validators/
  tickets.ts                  # Zod schemas
```

## Commit
```
feat: implement tickets module (CRUD + configurable types + resolution flow)
```
