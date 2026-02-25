# Meta-Prompt — Module Tâches
> Priority: P0 | Depends on: 00-schema, 01-auth, 02-clients, 03-runs

## Context
Module de gestion des tâches opérationnelles. Les tâches sont le travail quotidien des collaborateurs. Elles sont rattachées à un run (et donc à un client) et peuvent être de deux types :
- **Fiscales** : auto-générées par le moteur fiscal du module Runs (ne pas recréer ici)
- **Opérationnelles** : créées manuellement par les managers/associés pour des travaux divers

Ce module gère l'affichage, l'assignation, le suivi de status et les actions sur TOUTES les tâches (fiscales + opérationnelles).

## Stack
- Convex: queries, mutations
- shadcn/ui: Table, Card, Dialog, Form, Badge, Select, Calendar, Separator, Skeleton
- react-hook-form + zod
- Pas de bibliothèque externe supplémentaire

## Data Model
Table concernée : `taches` (déjà définie dans 03-runs)

### taches (rappel)
```typescript
taches: defineTable({
  runId: v.id("runs"),
  clientId: v.id("clients"),
  nom: v.string(),
  type: v.string(), // "fiscale" | "operationnelle"
  categorie: v.optional(v.string()), // "IR" | "IS" | "TVA" | "TAXES" | "AUTRE"
  cerfa: v.optional(v.string()),
  dateEcheance: v.optional(v.string()), // ISO date
  status: v.string(), // "a_venir" | "en_cours" | "en_attente" | "termine"
  assigneId: v.optional(v.string()),
  notes: v.optional(v.string()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_run", ["runId"])
.index("by_assigne", ["assigneId"])
.index("by_status", ["status"])
.index("by_echeance", ["dateEcheance"])
```

## Auth & Permissions
- **Voir les tâches** : tous les rôles (filtré par cascade via client)
  - Associé = toutes | Manager = tâches de ses clients | Collab = ses tâches assignées
- **Créer une tâche opérationnelle** : associé + manager du client
- **Modifier une tâche** : associé + manager + assigné
- **Changer le status** : associé + manager + assigné
- **Assigner/réassigner** : associé + manager du client
- **Supprimer une tâche** : associé uniquement (avec confirmation)

## Pages

### /taches — Liste de toutes les tâches
- **Layout group** : (dashboard)
- **Vue par défaut** : Table (DataTable shadcn)
- **Colonnes** : Nom, Client, Type (badge), Catégorie, Échéance, Status (badge), Assigné, Actions
- **Filtres** :
  - Status : à venir, en cours, en attente, terminé
  - Type : fiscale, opérationnelle
  - Assigné : select user
  - Client : select ou search
  - Période : date range pour l'échéance
- **Tri** : par échéance (défaut), par status, par client
- **Indicateurs visuels** :
  - Badge "En retard" rouge si dateEcheance < today ET status !== "termine"
  - Badge "J-3" orange si dateEcheance est dans les 3 prochains jours
- **Actions** : bouton "Nouvelle tâche" (crée une tâche opérationnelle)
- **Loading** : Skeleton table (10 rows)
- **Empty** : "Aucune tâche trouvée." avec suggestion de filtre

### /taches/[id] — Détail d'une tâche
- **Layout group** : (dashboard)
- **Components** : PageHeader avec breadcrumb (Client > Run > Tâche), Card
- **Infos** : nom, type, catégorie, cerfa, échéance, status, assigné, notes
- **Tabs** :
  1. **Détails** — toutes les informations
  2. **Gates** — points de contrôle liés (module 05)
  3. **Documents** — documents liés
- **Actions** :
  - Changer le status (Select inline ou buttons)
  - Assigner (Select user)
  - Modifier (Dialog)
  - Supprimer (AlertDialog, associé only)
- **Loading** : Skeleton card

### Création tâche opérationnelle — Dialog
- **Trigger** : bouton "Nouvelle tâche" sur /taches ou dans le détail d'un run
- **Champs** :
  - Run (Select, obligatoire) — pré-rempli si depuis un run
  - Nom (Input, obligatoire)
  - Catégorie (Select: "AUTRE" par défaut)
  - Date d'échéance (Calendar/DatePicker, optionnel)
  - Assigné (Select user, optionnel)
  - Notes (Textarea, optionnel)
- **Type** : automatiquement "operationnelle"
- **On success** : toast + fermer dialog + refresh liste

## Convex Functions

### Queries
- `taches.list` — Liste paginée des tâches visibles par l'utilisateur
  - Auth: logged in
  - Filtre par rôle cascade
  - Params: `{ runId?, clientId?, status?, type?, assigneId?, dateFrom?, dateTo?, search? }`
  - Returns: `Tache[]` avec client name et run info

- `taches.getById` — Détail d'une tâche
  - Auth: permission de voir (via client cascade)
  - Params: `{ id: v.id("taches") }`
  - Returns: Tache complète avec client, run, assigné (nom)

- `taches.listByRun` — Tâches d'un run spécifique
  - Params: `{ runId: v.id("runs") }`
  - Returns: `Tache[]` triées par dateEcheance ASC

- `taches.listByAssigne` — Mes tâches (pour le dashboard)
  - Params: `{ assigneId: string }`
  - Returns: `Tache[]` triées par dateEcheance ASC

- `taches.stats` — Statistiques pour le dashboard
  - Auth: logged in, filtré par rôle
  - Returns: `{ total, aVenir, enCours, enAttente, termine, enRetard }`

### Mutations
- `taches.create` — Créer une tâche opérationnelle
  - Auth: associé ou manager du client (via run → client)
  - Params: `{ runId, nom, categorie?, dateEcheance?, assigneId?, notes? }`
  - Sets: type="operationnelle", status="a_venir", createdAt, updatedAt, clientId (copié depuis run)
  - Returns: tacheId

- `taches.update` — Modifier une tâche
  - Auth: associé + manager + assigné
  - Params: `{ id, nom?, dateEcheance?, assigneId?, notes? }`
  - Sets: updatedAt
  - **Side effect** : si assigneId change → créer notification "tache_assignee"

- `taches.updateStatus` — Changer le status
  - Auth: associé + manager + assigné
  - Params: `{ id, status }`
  - Sets: updatedAt, completedAt (si status="termine")
  - **Validation** : transitions autorisées :
    - a_venir → en_cours
    - en_cours → en_attente | termine
    - en_attente → en_cours | termine
    - termine → en_cours (réouverture)

- `taches.delete` — Supprimer une tâche
  - Auth: associé uniquement
  - Params: `{ id }`
  - Supprime aussi les gates liées

## UI Components

### TaskTable
- DataTable shadcn avec colonnes triables
- Clic sur une ligne → navigate vers /taches/[id]
- Badges colorés pour type et status
- Indicateur "En retard" calculé côté client

### TaskStatusBadge
- Badge avec couleur selon status :
  - `a_venir` : gris (default)
  - `en_cours` : bleu/émeraude
  - `en_attente` : orange/ambre
  - `termine` : vert
- Variante "En retard" : rouge, prioritaire sur le status

### TaskForm
- Formulaire de création/édition avec react-hook-form + zod
- Select pour run, catégorie, assigné
- DatePicker pour échéance
- Validation : nom obligatoire, run obligatoire

### TaskStatusSelect
- Composant inline pour changer le status rapidement
- Select avec les transitions autorisées uniquement
- Optimistic update

## Valeurs des selects

### type
fiscale, opérationnelle

### categorie
IR, IS, TVA, TAXES, AUTRE

### status
À venir, En cours, En attente, Terminé

## User Stories

### US-1: Voir mes tâches
En tant que collaborateur, je veux voir la liste de toutes les tâches qui me sont assignées.
- [ ] La liste affiche mes tâches assignées par défaut
- [ ] Je peux filtrer par status, type, client, période
- [ ] Les tâches en retard sont visuellement distinctes (badge rouge)
- [ ] Les tâches à échéance proche (J-3) ont un badge orange
- [ ] Le tri par défaut est par date d'échéance

### US-2: Créer une tâche opérationnelle
En tant que manager, je veux créer une tâche opérationnelle pour un de mes runs.
- [ ] Dialog avec champs : nom, run, catégorie, échéance, assigné, notes
- [ ] Le type est automatiquement "opérationnelle"
- [ ] Nom et run sont obligatoires
- [ ] Toast de confirmation après création

### US-3: Changer le status d'une tâche
En tant que collaborateur, je veux mettre à jour le status de mes tâches.
- [ ] Select inline sur la tâche pour changer le status
- [ ] Seules les transitions valides sont proposées
- [ ] Si je passe à "terminé", completedAt est enregistré
- [ ] Mise à jour optimiste (UI change avant confirmation serveur)

### US-4: Assigner une tâche
En tant que manager, je veux assigner une tâche à un collaborateur.
- [ ] Select user dans le détail ou l'édition de la tâche
- [ ] Le collaborateur reçoit une notification "tâche assignée"
- [ ] Je ne peux assigner qu'aux membres de mon équipe

## Edge Cases
- Tâche fiscale modifiée manuellement → la régénération du run écrasera les changements (avertir)
- Tâche sans échéance → ne peut pas être "en retard"
- Tâche assignée à un user désactivé → réassigner ou warning
- Supprimer une tâche avec des gates validées → confirmation spéciale
- Créer une tâche sans run → impossible (toujours liée à un run)
- Status "termine" → ne plus afficher dans les filtres par défaut (sauf filtre explicite)

## Commit
```
feat: implement tasks module (list + CRUD + status flow + assignment)
```
