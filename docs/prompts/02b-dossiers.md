# Meta-Prompt — Module Dossiers (Missions)
> Priority: P0 | Depends on: 00-schema, 01-auth, 02-clients

## Context
Un dossier = une mission pour un client. Un client peut avoir plusieurs dossiers (compta, paie, audit, conseil, fiscal). Chaque dossier est assigné à un manager et un collaborateur. C'est via l'assignation des dossiers que les collaborateurs obtiennent leur visibilité sur les clients (cascade de permissions). Les runs sont rattachés à un dossier.

Hiérarchie : Client → Dossier(s) → Run(s) → Tâche(s)

## Stack
- Convex: queries, mutations
- shadcn/ui: Table, Card, Dialog, Form, Badge, Select, Separator, Skeleton
- react-hook-form + zod
- Pas de bibliothèque externe supplémentaire

## Data Model
Table : `dossiers`

### dossiers
```typescript
dossiers: defineTable({
  clientId: v.id("clients"),
  type: v.string(), // "comptabilite" | "paie" | "audit" | "conseil" | "fiscal"
  exercice: v.optional(v.string()), // ex: "2025" ou "2024-2025"
  managerId: v.optional(v.string()), // userId du manager responsable
  collaborateurId: v.optional(v.string()), // userId du collab assigné
  status: v.string(), // "actif" | "archive"
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_client", ["clientId"])
.index("by_manager", ["managerId"])
.index("by_collaborateur", ["collaborateurId"])
```

## Auth & Permissions
- **Voir les dossiers** : tous les rôles (filtré par cascade)
  - Associé = tous | Manager = ses dossiers | Collab = ses dossiers assignés
- **Créer un dossier** : associé + manager du client
- **Modifier un dossier** : associé + manager du dossier
- **Archiver un dossier** : associé uniquement
- **Assigner un collaborateur** : associé + manager du dossier

**IMPORTANT** : L'assignation d'un collaborateur à un dossier lui donne accès au client de ce dossier. C'est le mécanisme de visibilité cascade pour les collaborateurs.

## Pages

### Pas de page dédiée /dossiers
Les dossiers sont affichés dans :
1. **Onglet "Dossiers"** de la fiche client `/clients/[id]`
2. **Section dossier** dans le détail d'un run `/runs/[id]`

### Tab Dossiers dans /clients/[id]
- **Liste** des dossiers du client
- **Colonnes** : Type (badge), Exercice, Manager, Collaborateur, Status (badge), Actions
- **Actions** : Créer un dossier (Dialog), Modifier, Archiver
- **Loading** : Skeleton table (3 rows)
- **Empty** : "Aucun dossier pour ce client. Créez une mission."

### Création / Modification dossier — Dialog
- **Champs** :
  - Type (Select obligatoire) : comptabilité, paie, audit, conseil, fiscal
  - Exercice (Input, ex: "2025")
  - Manager (Select user avec rôle manager ou associé)
  - Collaborateur (Select user avec rôle collaborateur)
  - Notes (Textarea optionnel)
- **Validation** : type obligatoire, clientId obligatoire (pré-rempli)
- **On success** : toast + fermer dialog + refresh liste

## Convex Functions

### Queries
- `dossiers.listByClient` — Dossiers d'un client
  - Auth: permission de voir le client
  - Params: `{ clientId: v.id("clients") }`
  - Returns: `Dossier[]` avec noms du manager et collaborateur

- `dossiers.getById` — Détail d'un dossier
  - Auth: permission de voir (via client cascade)
  - Params: `{ id: v.id("dossiers") }`
  - Returns: Dossier complet

- `dossiers.listByCollaborateur` — Dossiers assignés à un collaborateur
  - Params: `{ collaborateurId: string }`
  - Returns: `Dossier[]` — utilisé pour la cascade de permissions

- `dossiers.listByManager` — Dossiers d'un manager
  - Params: `{ managerId: string }`
  - Returns: `Dossier[]`

### Mutations
- `dossiers.create` — Créer un dossier
  - Auth: associé ou manager du client
  - Params: `{ clientId, type, exercice?, managerId?, collaborateurId?, notes? }`
  - Sets: status="actif", createdAt, updatedAt
  - Returns: dossierId

- `dossiers.update` — Modifier un dossier
  - Auth: associé ou manager du dossier
  - Params: `{ id, type?, exercice?, managerId?, collaborateurId?, notes? }`
  - Sets: updatedAt

- `dossiers.archive` — Archiver un dossier
  - Auth: associé uniquement
  - Params: `{ id }`
  - Sets: status="archive", updatedAt
  - **Side effect** : avertir si des runs actifs existent

## UI Components

### DossierList
- Table affichée dans l'onglet Dossiers de la fiche client
- Badge coloré pour le type :
  - comptabilité : bleu
  - paie : violet
  - audit : orange
  - conseil : vert
  - fiscal : rouge/émeraude
- Badge status : actif (vert) / archivé (gris)

### DossierForm
- Formulaire dans un Dialog pour créer/modifier un dossier
- Select pour type, manager, collaborateur
- Input pour exercice
- Textarea pour notes

### DossierCard
- Version card du dossier (utilisée dans des listes courtes ou sur mobile)
- Affiche : type, exercice, manager, collaborateur, status

## Valeurs des selects

### type
Comptabilité, Paie, Audit, Conseil, Fiscal

### status
Actif, Archivé

## User Stories

### US-1: Voir les dossiers d'un client
En tant que manager, je veux voir la liste des missions ouvertes pour un de mes clients.
- [ ] L'onglet Dossiers affiche tous les dossiers du client
- [ ] Je vois le type, l'exercice, le collaborateur assigné et le status
- [ ] Je peux filtrer par status (actif/archivé)

### US-2: Créer un dossier
En tant qu'associé ou manager, je veux créer une nouvelle mission pour un client.
- [ ] Dialog avec les champs type, exercice, manager, collaborateur
- [ ] Le type est obligatoire
- [ ] Après création, le dossier apparaît dans la liste
- [ ] Toast de confirmation

### US-3: Assigner un collaborateur
En tant que manager, je veux assigner un collaborateur à un dossier.
- [ ] Select user filtré par rôle collaborateur
- [ ] Après assignation, le collaborateur a accès au client
- [ ] Le manager peut changer l'assignation

### US-4: Archiver un dossier
En tant qu'associé, je veux archiver un dossier terminé.
- [ ] Bouton "Archiver" avec AlertDialog de confirmation
- [ ] Si des runs actifs existent → avertissement
- [ ] Le dossier passe en status "archivé"

## Edge Cases
- Archiver un dossier avec des runs en cours → AlertDialog d'avertissement (pas bloquant)
- Collaborateur assigné désactivé → warning dans la liste
- Client archivé → ses dossiers sont aussi archivés automatiquement
- Plusieurs dossiers du même type pour un client → autorisé (exercices différents)
- Dossier sans collaborateur → visible uniquement par le manager et l'associé

## Commit
```
feat: implement dossiers module (CRUD + team assignment + permissions cascade)
```
