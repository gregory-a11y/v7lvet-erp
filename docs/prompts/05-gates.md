# Meta-Prompt — Module Gates (Points de Controle)
> Priority: P1 | Depends on: 00-schema, 01-auth, 03-runs, 04-taches

## Context
Les Gates sont des points de controle qualite configurables a deux niveaux : au niveau **tache** et au niveau **run**. Elles formalisent le processus de validation du cabinet comptable : qui valide, quelle preuve est attendue, et que faire si la validation est bloquee.

Une Gate agit comme un verrou entre deux phases de travail. Tant qu'elle n'est pas validee, les taches situees apres elle dans le run restent verrouillees (opacite reduite, checkbox disabled, icone cadenas). La validation d'une gate deverrouille les taches suivantes avec une animation (Framer Motion).

Les **gateTemplates** permettent a l'associe de creer des modeles de gates reutilisables. Lors de la creation d'un run, les templates sont automatiquement appliques pour standardiser les controles sur tous les dossiers.

Reference : `docs/prd.md#65-gates`, `docs/schema-draft.ts`, `docs/pages.md`

## Stack
- Convex: queries, mutations, actions (scheduled pour escalade auto)
- shadcn/ui: Card, Badge, Button, Dialog, AlertDialog, Separator, Form, Input, Textarea, Select, Skeleton, Sheet
- react-hook-form + zod
- Framer Motion: animation de deverrouillage des taches apres validation
- Pas de bibliotheque externe supplementaire

## Data Model
Tables concernees : `gates`, `gateTemplates`

### gates
```typescript
gates: defineTable({
  tacheId: v.optional(v.id("taches")),
  runId: v.optional(v.id("runs")),
  nom: v.string(),
  description: v.optional(v.string()),
  ordre: v.number(), // position dans la sequence du run/tache
  responsableId: v.id("users"), // utilisateur designe pour valider

  // Preuve attendue et fournie
  preuveAttendue: v.string(), // description de ce qui est attendu (lien Pennylane, document, message)
  preuveUrl: v.optional(v.string()), // URL du fichier uploade via Convex Storage
  preuveLien: v.optional(v.string()), // lien externe (ex: lien DGFiP, Pennylane)

  // Validation
  status: v.union(
    v.literal("en_attente"),
    v.literal("valide"),
    v.literal("rejete"),
    v.literal("escalade"),
  ), // "en_attente" | "valide" | "rejete" | "escalade"
  typeValidation: v.union(
    v.literal("revue"),
    v.literal("validation_associe"),
  ), // "revue" (manager) | "validation_associe" (associe)
  validePar: v.optional(v.id("users")), // qui a effectivement valide
  valideAt: v.optional(v.number()), // timestamp de validation

  // Escalade
  escaladeRegle: v.optional(v.string()), // description de la regle d'escalade
  escaladeApres: v.optional(v.number()), // nombre de jours avant escalade automatique
  escaladeAt: v.optional(v.number()), // timestamp de l'escalade effective

  // Commentaire
  commentaire: v.optional(v.string()), // commentaire de validation ou refus

  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_tache", ["tacheId"])
.index("by_run", ["runId"])
.index("by_status", ["status"])
.index("by_responsable", ["responsableId"])
```

### gateTemplates
```typescript
gateTemplates: defineTable({
  nom: v.string(),
  description: v.optional(v.string()),
  preuveAttendue: v.string(), // description type de preuve
  typeValidation: v.union(
    v.literal("revue"),
    v.literal("validation_associe"),
  ), // role requis pour valider
  escaladeRegle: v.optional(v.string()),
  escaladeApres: v.optional(v.number()), // jours avant escalade
  ordre: v.number(), // ordre d'application dans le run
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_nom", ["nom"])
.index("by_ordre", ["ordre"])
```

## Auth & Permissions
- **Voir les gates** : tous les roles (filtrage en cascade via le client du run/tache)
- **Creer une gate / appliquer un template** : associe + manager
- **Valider une gate (type "revue")** : manager + associe
- **Valider une gate (type "validation_associe")** : associe uniquement
- **Refuser une gate** : le responsable designe (ou role superieur)
- **Supprimer une gate** : associe uniquement
- **CRUD gateTemplates** : associe uniquement

## Pages

### Affichage des Gates dans /runs/[id]
Les gates ne sont PAS une page independante. Elles apparaissent directement dans la vue timeline du run, comme des separateurs visuels entre les phases de taches.

```
Phase 1 : Collecte
  [x] Tache 1.1 — Recuperer les releves bancaires
  [x] Tache 1.2 — Demander les factures manquantes
  [x] Tache 1.3 — Verifier les pieces justificatives
--- GATE : Validation collecte (Manager) [valide] ---
Phase 2 : Saisie
  [ ] Tache 2.1 — Saisie des ecritures
  [ ] Tache 2.2 — Lettrage des comptes
--- GATE : Validation saisie (Associe) [en_attente] ---
Phase 3 : Revision (VERROUILLE)
  [ ] Tache 3.1 — Revision des comptes (disabled, cadenas)
  [ ] Tache 3.2 — Etablissement du bilan (disabled, cadenas)
```

- Chaque gate est rendue comme un `Separator` avec une icone cadenas (Lock/Unlock) et un `Badge` colore selon le status
- Les taches apres une gate non validee sont affichees en opacite reduite avec checkbox `disabled`
- Clic sur la gate ouvre le `GateValidationDialog`

### Affichage des Gates dans /taches/[id] (si gate liee a une tache)
- Dans le detail d'une tache, une section "Points de controle" affiche les gates liees
- Meme logique : la tache ne peut pas etre marquee "termine" tant que ses gates ne sont pas toutes validees

### /settings — Onglet "Templates de gates"
- Accessible dans la page Settings, section dediee (onglet ou accordeon)
- **Layout** : liste des templates avec actions inline
- **Colonnes** : Nom, Role requis, Preuve attendue, Escalade (jours), Ordre, Actions
- **Actions** : Ajouter un template (Dialog), Modifier, Supprimer (AlertDialog)
- **Loading** : Skeleton table
- **Empty** : "Aucun template de gate. Creez un modele pour standardiser vos controles." + CTA

## Convex Functions

### Queries

- `gates.listByRun` — Lister toutes les gates d'un run, triees par ordre
  - Auth: logged in, permission de voir le run (cascade via client)
  - Params: `{ runId: v.id("runs") }`
  - Returns: `Gate[]` avec responsable (nom, image) enrichi

- `gates.listByTache` — Lister les gates d'une tache specifique
  - Auth: logged in, permission de voir la tache (cascade via run > client)
  - Params: `{ tacheId: v.id("taches") }`
  - Returns: `Gate[]` triees par ordre

- `gates.getById` — Detail d'une gate
  - Auth: permission de voir le run/tache parent
  - Params: `{ id: v.id("gates") }`
  - Returns: Gate complete avec responsable enrichi

- `gateTemplates.list` — Lister tous les templates de gates
  - Auth: associe ou manager
  - Params: aucun
  - Returns: `GateTemplate[]` triees par ordre

### Mutations

- `gates.create` — Creer une gate manuellement
  - Auth: associe ou manager
  - Params: `{ tacheId?, runId?, nom, description?, preuveAttendue, responsableId, typeValidation, escaladeRegle?, escaladeApres?, ordre }`
  - Validation: au moins un de `tacheId` ou `runId` doit etre renseigne
  - Sets: status="en_attente", createdAt, updatedAt

- `gates.validate` — Valider une gate
  - Auth: role suffisant selon `typeValidation` ("revue" = manager+, "validation_associe" = associe uniquement)
  - Params: `{ id: v.id("gates"), commentaire?: string }`
  - Validation: `preuveUrl` ou `preuveLien` doit etre renseigne (preuve fournie obligatoire)
  - Sets: status="valide", validePar=currentUserId, valideAt=Date.now(), commentaire, updatedAt
  - Side-effect: deverrouille les taches suivantes (aucune mutation directe, le verrouillage est calcule cote UI via l'ordre des gates)
  - Side-effect: cree une notification pour le collaborateur assigne aux taches suivantes

- `gates.refuse` — Refuser une gate
  - Auth: role suffisant selon `typeValidation`
  - Params: `{ id: v.id("gates"), commentaire: v.string() }` (commentaire OBLIGATOIRE en cas de refus)
  - Sets: status="rejete", validePar=currentUserId, valideAt=Date.now(), commentaire, updatedAt
  - Side-effect: remet la tache associee en status "en_cours" (si gate au niveau tache)
  - Side-effect: cree une notification au collaborateur assigne ("Gate refusee : [commentaire]")

- `gates.uploadPreuve` — Uploader une preuve (fichier)
  - Auth: le responsable designe ou role superieur
  - Params: `{ id: v.id("gates"), storageId: v.string() }`
  - Sets: preuveUrl (URL generee depuis Convex Storage), updatedAt

- `gates.addPreuveLien` — Ajouter un lien de preuve externe
  - Auth: le responsable designe ou role superieur
  - Params: `{ id: v.id("gates"), lien: v.string() }`
  - Sets: preuveLien, updatedAt

- `gates.delete` — Supprimer une gate
  - Auth: associe uniquement
  - Params: `{ id: v.id("gates") }`
  - AlertDialog de confirmation cote UI

- `gates.applyTemplate` — Appliquer un template de gate a un run
  - Auth: associe ou manager
  - Params: `{ runId: v.id("runs"), templateId: v.id("gateTemplates"), responsableId: v.id("users") }`
  - Logique: lit le template, cree une gate avec les valeurs du template + responsableId fourni
  - Sets: status="en_attente", createdAt, updatedAt

- `gates.applyAllTemplates` — Appliquer TOUS les templates de gates a un run
  - Auth: associe ou manager
  - Params: `{ runId: v.id("runs"), responsableId: v.id("users") }`
  - Logique: itere sur tous les gateTemplates (tries par ordre), cree une gate pour chacun
  - Appelee automatiquement apres `runs.create` si des templates existent

- `gateTemplates.create` — Creer un template
  - Auth: associe uniquement
  - Params: `{ nom, description?, preuveAttendue, typeValidation, escaladeRegle?, escaladeApres?, ordre }`
  - Sets: createdAt, updatedAt

- `gateTemplates.update` — Modifier un template
  - Auth: associe uniquement
  - Params: `{ id: v.id("gateTemplates"), ...fieldsToUpdate }`
  - Sets: updatedAt

- `gateTemplates.delete` — Supprimer un template
  - Auth: associe uniquement
  - Params: `{ id: v.id("gateTemplates") }`

### Actions (Scheduled)

- `gates.checkEscalation` — Verifier les gates a escalader (cron ou scheduled function)
  - Executee toutes les 24h (Convex cron)
  - Logique: pour chaque gate en status "en_attente" avec `escaladeApres` defini, verifier si `createdAt + (escaladeApres * 86400000) < Date.now()`
  - Si oui: passer la gate en status "escalade", enregistrer escaladeAt, notifier l'associe
  - Cron config dans `convex/crons.ts`:
    ```typescript
    import { cronJobs } from "convex/server"
    import { internal } from "./_generated/api"

    const crons = cronJobs()
    crons.daily(
      "check gate escalation",
      { hourUTC: 7, minuteUTC: 0 }, // 8h Paris
      internal.gates.checkEscalation,
    )
    export default crons
    ```

## UI Components

### GateSeparator
- Separateur visuel dans la timeline du run, entre deux phases de taches
- Affiche: icone Lock/Unlock, nom de la gate, Badge status, Avatar du responsable
- Couleurs:
  - `en_attente` : gris/neutre, icone Lock
  - `valide` : emeraude V7LVET, icone Unlock
  - `rejete` : rouge, icone XCircle
  - `escalade` : orange/ambre, icone AlertTriangle
- Clic → ouvre `GateValidationDialog`

### GateValidationDialog
- Dialog modale pour valider ou refuser une gate
- **Header** : nom de la gate + Badge status
- **Body** :
  - Section "Preuve attendue" : affiche `preuveAttendue` (texte descriptif)
  - Section "Preuve fournie" :
    - Si `preuveUrl` : lien vers le fichier uploade + preview si image/PDF
    - Si `preuveLien` : lien cliquable vers la ressource externe
    - Si aucune preuve : message "Aucune preuve fournie" + boutons d'upload
  - Bouton "Uploader un fichier" (Convex File Storage upload)
  - Input "Lien externe" (URL)
  - Textarea "Commentaire" (optionnel pour validation, obligatoire pour refus)
- **Footer** :
  - Bouton "Refuser" (variant destructive) — desactive si pas de commentaire
  - Bouton "Valider" (variant default, couleur emeraude) — desactive si pas de preuve
- **Apres validation** : toast "Gate validee", animation Framer Motion sur les taches deverrouillees
- **Apres refus** : toast "Gate refusee", notification au collaborateur

### GateCard
- Composant compact pour afficher une gate dans le detail d'une tache (`/taches/[id]`)
- Affiche : nom, responsable (Avatar + nom), status (Badge), preuve attendue, date de validation si applicable
- Actions : bouton "Valider" si le user courant a le role requis

### GateTemplateManager
- Composant pour la page /settings, section templates de gates
- **Liste** : DataTable avec colonnes Nom, Role requis, Preuve attendue, Escalade, Ordre, Actions
- **Actions par ligne** : Modifier (Dialog), Supprimer (AlertDialog)
- **Bouton global** : "Nouveau template" → ouvre `GateTemplateDialog`
- **Empty state** : "Aucun template de gate configure."

### GateTemplateDialog
- Dialog pour creer ou modifier un template de gate
- Champs :
  - Nom (Input, obligatoire)
  - Description (Textarea, optionnel)
  - Preuve attendue (Textarea, obligatoire)
  - Type de validation (Select: "Revue (Manager)" / "Validation Associe")
  - Regle d'escalade (Textarea, optionnel)
  - Escalade apres X jours (Input number, optionnel)
  - Ordre (Input number, obligatoire)
- Validation : zod schema, nom et preuveAttendue obligatoires
- On success : toast + ferme le dialog

### GateEscaladeBanner
- Banniere d'alerte affichee dans le dashboard et dans le detail du run
- Apparait si au moins une gate est en status "escalade"
- Affiche : icone AlertTriangle, "X gate(s) en escalade necessitent votre attention", lien vers le run
- Visible uniquement par l'associe

## Zod Schemas

```typescript
// lib/validators/gates.ts
import { z } from "zod"

export const gateCreateSchema = z.object({
  tacheId: z.string().optional(),
  runId: z.string().optional(),
  nom: z.string().min(1, "Le nom est obligatoire"),
  description: z.string().optional(),
  preuveAttendue: z.string().min(1, "La preuve attendue est obligatoire"),
  responsableId: z.string().min(1, "Le responsable est obligatoire"),
  typeValidation: z.enum(["revue", "validation_associe"]),
  escaladeRegle: z.string().optional(),
  escaladeApres: z.number().min(1).optional(),
  ordre: z.number().min(0),
}).refine(
  (data) => data.tacheId || data.runId,
  { message: "Une gate doit etre liee a une tache ou un run" }
)

export const gateValidateSchema = z.object({
  id: z.string().min(1),
  commentaire: z.string().optional(),
})

export const gateRefuseSchema = z.object({
  id: z.string().min(1),
  commentaire: z.string().min(1, "Le commentaire est obligatoire en cas de refus"),
})

export const gateTemplateSchema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  description: z.string().optional(),
  preuveAttendue: z.string().min(1, "La preuve attendue est obligatoire"),
  typeValidation: z.enum(["revue", "validation_associe"]),
  escaladeRegle: z.string().optional(),
  escaladeApres: z.number().min(1).optional(),
  ordre: z.number().min(0),
})
```

## User Stories

### US-1 : Valider une gate apres verification de la preuve
En tant que Manager ou Associe, je veux valider une gate apres avoir verifie la preuve fournie par le collaborateur.
- [ ] La gate s'affiche comme un separateur visuel entre les phases de taches dans /runs/[id]
- [ ] Seul le responsable designe (ou un role superieur) peut valider
- [ ] La preuve (fichier ou lien) doit etre fournie avant de pouvoir valider
- [ ] Choix : "Valider" ou "Refuser" avec commentaire obligatoire en cas de refus
- [ ] Apres validation, les taches suivantes se deverrouillent avec animation Framer Motion
- [ ] Apres refus, la tache associee repasse en "en_cours" et le collaborateur recoit une notification
- [ ] Toast de confirmation dans les deux cas

### US-2 : Escalade automatique des gates bloquees
En tant qu'Associe, je veux que les gates bloquees soient automatiquement escaladees apres un delai configurable.
- [ ] Si une gate est en status "en_attente" depuis plus de `escaladeApres` jours, elle passe en "escalade"
- [ ] L'associe est notifie de l'escalade (notification in-app)
- [ ] La gate escaladee est visible avec un Badge orange/ambre et une icone AlertTriangle
- [ ] Une banniere d'alerte apparait dans le dashboard de l'associe
- [ ] Le cron Convex s'execute quotidiennement a 8h (heure de Paris)

### US-3 : Configurer des templates de gates reutilisables
En tant qu'Associe, je veux creer des templates de gates pour standardiser les points de controle sur tous les dossiers.
- [ ] CRUD complet sur les templates dans Settings > Templates de gates
- [ ] Un template definit : nom, preuve attendue, type de validation, regle d'escalade, delai d'escalade, ordre
- [ ] Le formulaire valide avec zod (nom et preuve attendue obligatoires)
- [ ] Seul l'associe peut acceder a cette section

### US-4 : Appliquer les templates lors de la creation d'un run
En tant que Manager, je veux que les templates de gates soient automatiquement appliques quand je cree un run.
- [ ] Apres creation du run + generation des taches fiscales, les templates de gates sont appliques
- [ ] Chaque template cree une gate avec status "en_attente"
- [ ] L'associe ou le manager doit designer un responsable pour chaque gate (ou un responsable par defaut)
- [ ] Les gates sont inserees dans le run selon leur champ `ordre`
- [ ] Si aucun template n'existe, le run est cree sans gates (fonctionnement normal)

### US-5 : Fournir une preuve pour une gate
En tant que Collaborateur, je veux pouvoir fournir une preuve (fichier ou lien) pour qu'une gate puisse etre validee.
- [ ] Je peux uploader un fichier (PDF, image, document) via Convex File Storage
- [ ] Je peux ajouter un lien externe (Pennylane, DGFiP, etc.)
- [ ] La preuve est visible dans le GateValidationDialog
- [ ] Apres avoir fourni la preuve, le responsable est notifie

## Edge Cases

- **Gate sans preuve fournie** → le bouton "Valider" reste desactive, message explicatif
- **Gate avec tacheId ET runId** → le schema exige au moins un, mais les deux sont acceptes (gate liee a une tache specifique dans un run)
- **Gate sans tacheId ni runId** → erreur de validation a la creation (refine zod)
- **Suppression d'un run avec des gates** → les gates associees doivent etre supprimees en cascade (dans `runs.delete`)
- **Suppression d'une tache avec des gates** → les gates associees doivent etre supprimees en cascade
- **Responsable supprime ou desactive** → la gate reste en "en_attente", l'escalade prendra le relais
- **Toutes les gates validees mais run pas termine** → pas de passage automatique, le status du run reste gere manuellement
- **Gate en "escalade" puis validee** → le status passe de "escalade" a "valide" normalement
- **Template supprime apres application** → les gates deja creees ne sont pas affectees (pas de lien vivant)
- **Plusieurs gates avec le meme ordre** → les afficher dans l'ordre de creation (createdAt ASC) en cas d'egalite
- **Upload de preuve echoue** → toast d'erreur "Echec de l'upload. Reessayez.", ne pas modifier la gate
- **Escalade quand l'associe est absent** → la gate reste en "escalade" jusqu'a validation manuelle (pas de 2e niveau d'escalade en MVP)

## Integration avec les autres modules

### Module Runs (03-runs)
- Apres `runs.create` et la generation des taches fiscales, appeler `gates.applyAllTemplates` si des templates existent
- Dans `runs.delete`, supprimer toutes les gates liees (`by_run` index)
- Dans la page /runs/[id], afficher les gates comme separateurs dans la timeline

### Module Taches (04-taches)
- Une tache ne peut pas passer en status "termine" si elle a des gates non validees
- Dans `taches.delete`, supprimer les gates liees (`by_tache` index)
- Dans la page /taches/[id], afficher la section "Points de controle" avec les gates

### Module Notifications (10-notifications)
- Creer une notification de type "gate_en_attente" quand une gate est creee
- Creer une notification de type "gate_validee" quand une gate est validee
- Creer une notification lors du refus (avec le commentaire)
- Creer une notification lors de l'escalade

### Module Dashboard (08-dashboard)
- Afficher le `GateEscaladeBanner` si des gates sont en escalade (associe uniquement)
- Widget "Gates en attente" dans le dashboard du manager

## Commit
```
feat: implement gates module (checkpoints + templates + escalation)
```
