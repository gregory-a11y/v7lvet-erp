# Meta-Prompt — Module Runs (Moteur Fiscal)
> Priority: P0 | Depends on: 00-schema, 01-auth, 02-clients

## Context
Le module Runs est le COEUR de l'ERP. Un Run = un exercice fiscal annuel pour un client donné, rattaché à un dossier. Quand un Run est créé, le moteur fiscal génère automatiquement toutes les tâches fiscales (obligations déclaratives) en fonction des caractéristiques fiscales du client. C'est l'automatisation principale qui remplace l'ancien script Airtable.

**Run ≠ Tâche** : Un Run est un conteneur d'obligations fiscales avec des échéances légales. Les Tâches (module 04) sont des travaux opérationnels liés aux Runs.

## Stack
- Convex: queries, mutations, actions
- shadcn/ui: Table, Card, Tabs, Dialog, Form, Badge, Separator, Skeleton, Calendar
- react-hook-form + zod
- Vue Gantt : bibliothèque à déterminer (gantt-task-react ou custom avec CSS Grid)
- Pas de bibliothèque externe supplémentaire

## Data Model
Tables concernées : `runs`, `taches` (pour les tâches fiscales auto-générées)

### runs
```typescript
runs: defineTable({
  clientId: v.id("clients"),
  dossierId: v.optional(v.id("dossiers")),
  exercice: v.number(), // année N (ex: 2025)
  dateDebut: v.string(), // ISO date
  dateFin: v.string(), // ISO date
  status: v.string(), // "a_venir" | "en_cours" | "en_attente" | "termine"
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_client", ["clientId"])
.index("by_dossier", ["dossierId"])
.index("by_status", ["status"])
```

### taches (tâches fiscales auto-générées)
```typescript
taches: defineTable({
  runId: v.id("runs"),
  clientId: v.id("clients"),
  nom: v.string(), // nom de la tâche fiscale
  type: v.string(), // "fiscale" | "operationnelle"
  categorie: v.optional(v.string()), // "IR" | "IS" | "TVA" | "TAXES" | "AUTRE"
  cerfa: v.optional(v.string()), // numéro Cerfa si applicable
  dateEcheance: v.optional(v.string()), // ISO date
  status: v.string(), // "a_venir" | "en_cours" | "en_attente" | "termine"
  assigneId: v.optional(v.string()), // userId
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
- **Voir les runs** : tous les rôles (filtré par cascade)
- **Créer un run** : associé + manager du client
- **Modifier un run** : associé + manager du client
- **Supprimer un run** : associé uniquement
- **Voir les tâches fiscales** : tous les rôles (filtré par cascade via le client)

## Pages

### /runs — Vue Gantt des Runs (IMPÉRATIF)
- **Layout group** : (dashboard)
- **Vue principale** : Gantt chart (OBLIGATOIRE)
  - Axe Y : clients (groupés par manager optionnel)
  - Axe X : timeline (mois de l'année)
  - Barres : les runs avec couleur selon status
  - Sous-barres ou marqueurs : les tâches fiscales avec leurs échéances
- **Filtres** : par manager, par status, par année d'exercice
- **Actions** : clic sur un run → sidebar détail ou navigate vers /runs/[id]
- **Loading** : Skeleton Gantt
- **Empty** : "Aucun run. Créez un exercice fiscal pour un client."

### /runs/[id] — Détail d'un Run
- **Layout group** : (dashboard)
- **Components** : PageHeader avec breadcrumb (Client > Dossier > Run), Card, Tabs
- **Infos affichées** : Client, exercice, dates, status, progression (nb tâches terminées / total)
- **Tabs** :
  1. **Tâches fiscales** — liste des tâches auto-générées avec échéances, statuts, badges
  2. **Gates** — points de contrôle du run (module 05)
  3. **Documents** — documents liés au run
- **Actions** : Modifier status, Régénérer tâches (AlertDialog de confirmation)
- **Loading** : Skeleton card

### Création d'un Run — Dialog depuis /clients/[id] ou /runs
- **Trigger** : bouton "Créer un exercice fiscal" sur la fiche client ou la page runs
- **Champs** : Client (pré-rempli si depuis fiche client), Exercice (année), Dossier (optionnel)
- **On submit** : crée le run PUIS lance le moteur fiscal qui génère les tâches
- **On success** : toast + redirect vers /runs/[id]

## Convex Functions

### Queries
- `runs.list` — Liste des runs visibles par l'utilisateur
  - Auth: logged in
  - Filtre par rôle cascade
  - Params: `{ clientId?: Id, dossierId?: Id, status?: string, exercice?: number }`
  - Returns: `Run[]` avec client name et progression

- `runs.getById` — Détail d'un run avec ses tâches
  - Auth: permission de voir ce run (via client)
  - Params: `{ id: v.id("runs") }`
  - Returns: Run complet + tâches fiscales triées par dateEcheance

- `runs.listByClient` — Runs d'un client spécifique
  - Params: `{ clientId: v.id("clients") }`

### Mutations
- `runs.create` — Créer un run
  - Auth: associé ou manager du client
  - Params: `{ clientId, dossierId?, exercice }`
  - Sets: createdAt, updatedAt, status="a_venir", dateDebut, dateFin
  - **APRÈS CRÉATION** : appelle `runs.generateFiscalTasks` automatiquement

- `runs.update` — Modifier un run
  - Auth: associé ou manager
  - Params: `{ id, status?, notes? }`

- `runs.delete` — Supprimer un run et ses tâches
  - Auth: associé uniquement
  - AlertDialog de confirmation

- `runs.generateFiscalTasks` — LE MOTEUR FISCAL (mutation interne)
  - Appelée automatiquement après `runs.create`
  - Peut être relancée manuellement (régénération)
  - Params: `{ runId: v.id("runs") }`
  - Logique : lit le client associé, applique TOUTES les conditions ci-dessous, crée les tâches

## MOTEUR FISCAL — Logique complète de génération des tâches

### Variables d'entrée (lues depuis le client)
```typescript
const client = await ctx.db.get(run.clientId)
const {
  categorieFiscale,    // "IR - BNC" | "IR - BIC" | "IR - RF" | "IS"
  regimeFiscal,        // "Micro" | "Réel simplifié" | "Réel normal" | "Réel complet"
  regimeTVA,           // "Franchise en base de TVA" | "Exonérée de TVA" | "Réel normal" | "Régime réel simplifié (RSI)"
  frequenceTVA,        // "Mensuelle" | "Trimestrielle" | "Annuelle"
  jourTVA,             // nombre de jours après fin de période
  dateClotureComptable,// "DD/MM" (ex: "31/12")
  activite,            // "Profession libérale médicale conventionnée" | "Autres professions libérales" | "Activité commerciale industrielle artisanale"
  caN1,                // chiffre d'affaires N-1
  paiementISUnique,    // boolean — si true, pas d'acomptes IS
  montantCFEN1,        // montant CFE N-1
  montantTSN1,         // montant taxe sur salaires N-1
  nombreEmployes,      // nombre d'employés
  proprietaire,        // boolean — local professionnel propriété
  localPro,            // boolean — local professionnel
  secteur,             // "Commerce & Distribution" etc.
  surfaceCommerciale,  // m²
  departement,         // code département (75, 92, etc.)
  taxeFonciere,        // boolean
  tve,                 // boolean
  formeJuridique,      // "SARL" | "SAS" | "SA" etc.
} = client

const exercice = run.exercice // année N
const dateCloture = parseDateCloture(dateClotureComptable, exercice)
const isCloture3112 = dateCloture.month === 12 && dateCloture.day === 31
```

### Fonctions utilitaires
```typescript
// Ajouter des mois (et demi-mois) à une date
function addMonths(date: Date, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + Math.floor(months))
  if (months % 1 !== 0) d.setDate(d.getDate() + 15) // demi-mois = +15 jours
  return d.toISOString().split('T')[0]
}

// Date fixe
function fixedDate(day: number, month: number, year: number): string {
  return new Date(year, month - 1, day).toISOString().split('T')[0]
}

// Ajouter des jours
function addDays(year: number, month: number, day: number, days: number): string {
  const d = new Date(year, month - 1, day)
  d.setTime(d.getTime() + (days * 86400000))
  return d.toISOString().split('T')[0]
}
```

### Condition 1 — IR (Impôt sur le Revenu)
```
SI categorieFiscale contient "IR" :
  → Créer "Déclaration IR"
  → Échéance : si 31/12 → +4.5 mois | sinon → 15/05/N+1
```

### Condition 2 — BNC (Bénéfices Non Commerciaux)
```
SI categorieFiscale === "IR - BNC" ET regimeFiscal contient "Réel" :
  → Créer "Déclaration de résultat 2035 + annexes 2035 A et B"
  → Échéance : si 31/12 → +4.5 mois | sinon → 15/05/N+1
```

### Condition 3 — BIC (Bénéfices Industriels et Commerciaux)
```
SI categorieFiscale === "IR - BIC" ET regimeFiscal === "Réel normal" :
  → Créer "IR - Déclaration de résultat : liasse fiscale complète"
  → Échéance : si 31/12 → +4.5 mois | sinon → 15/05/N+1

SI categorieFiscale === "IR - BIC" ET regimeFiscal === "Réel simplifié" :
  → Créer "IR - Déclaration de résultat : liasse fiscale simplifiée"
  → Échéance : si 31/12 → +4.5 mois | sinon → 15/05/N+1
```

### Condition 4 — RF (Revenus Fonciers)
```
SI categorieFiscale === "IR - RF" ET regimeFiscal contient "simplifié" :
  → Créer "Déclaration de résultat : liasse fiscale simplifiée (2072-S)"
  → Échéance : si 31/12 → +4.5 mois | sinon → 15/05/N+1

SI categorieFiscale === "IR - RF" ET regimeFiscal contient "complet" :
  → Créer "Déclaration de résultat : liasse fiscale complète (2072-C)"
  → Échéance : si 31/12 → +4.5 mois | sinon → 15/05/N+1
```

### Condition 5 — DSFU / PAMC
```
SI activite === "Profession libérale médicale conventionnée"
   OU activite === "Autres professions libérales"
   OU activite === "Activité commerciale, industrielle, artisanale" :
  → Créer "Déclaration DSFU (+PAMC)"
  → Échéance : 15/05/N+1
```

### Condition 6 — IS Déclarations de résultat
```
SI categorieFiscale === "IS" ET regimeFiscal === "Réel simplifié" :
  → Créer "IS - Déclaration de résultat : liasse fiscale simplifiée"
  → Échéance : si 31/12 → 15/05/N+1 | sinon → +3.5 mois

SI categorieFiscale === "IS" ET regimeFiscal === "Réel normal" :
  → Créer "IS - Déclaration de résultat : liasse fiscale complète"
  → Échéance : si 31/12 → 15/05/N+1 | sinon → +3.5 mois
```

### Condition 7 — IS Solde
```
SI categorieFiscale === "IS" :
  → Créer "Déclaration solde IS - Cerfa 2572"
  → Échéance : si 31/12 → 15/05/N+1 | sinon → +4.5 mois
```

### Condition 8 — IS Approbation des comptes
```
SI categorieFiscale === "IS" :
  → Créer "Approbation des comptes (AGO)"
  → Échéance : dateCloture + 6 mois
```

### Condition 9 — IS Dépôt & Comptes annuels
```
SI categorieFiscale === "IS" :
  → Créer "Dépôt des comptes au greffe"
  → Créer "Etablissement des comptes annuels"
  → Créer "Entretien de présentation des comptes annuels"
  → Échéance : date AGO + 2 mois
```

### Condition 10 — IS Revenus capitaux mobiliers
```
SI categorieFiscale === "IS" :
  → Créer "Déclaration revenus capitaux mobiliers - Cerfa 2777"
  → Échéance : date AGO + 15 jours

  → Créer "Déclaration revenus de capitaux mobiliers - Cerfa IFU 2561"
  → Échéance : 15/02/N+1
```

### Condition 11 — IS Acomptes
```
SI categorieFiscale === "IS" :
  → Créer "IS - Solde"
  → Échéance : si 31/12 → +4.5 mois | sinon → +3.5 mois

SI categorieFiscale === "IS" ET paiementISUnique === false :
  → Créer "IS - Acompte_1", "IS - Acompte_2", "IS - Acompte_3", "IS - Acompte_4"
  → Dates selon période de clôture :

  | Période de clôture                          | Acompte 1   | Acompte 2   | Acompte 3   | Acompte 4   |
  |----------------------------------------------|-------------|-------------|-------------|-------------|
  | 20 février – 19 mai N                        | 15/06/N-1   | 15/09/N-1   | 15/12/N-1   | 15/03/N     |
  | 20 mai – 19 août N                           | 15/09/N-1   | 15/12/N-1   | 15/03/N     | 15/06/N     |
  | 20 août – 19 novembre N                      | 15/12/N-1   | 15/03/N     | 15/06/N     | 15/09/N     |
  | 20 novembre N – 19 février N+1 (année civile)| 15/03/N     | 15/06/N     | 15/09/N     | 15/12/N     |
```

### Condition 12 — CVAE
```
SI caN1 < 152500 → RIEN

SI caN1 > 152500 :
  → Créer "Déclaration de valeur ajoutée (1330) + CVAE"
  → Échéance : 15/05/N+1

SI caN1 > 500000 :
  → Créer "CVAE - Formulaire 1329 - AC - SD - Solde"
  → Échéance : 01/05/N+1

SI caN1 > 500000 ET montantCVAEN1 > 1500 :
  → Créer "CVAE - Formulaire 1329 - AC - SD - Acompte_1" → 15/06/N
  → Créer "CVAE - Formulaire 1329 - AC - SD - Acompte_2" → 15/09/N
```

### Condition 13 — CFE
```
TOUJOURS :
  → Créer "CFE - Solde" → 15/12/N
  → Créer "CFE - Modification déclaration (1447 - M)" → 30/04/N+1

SI montantCFEN1 >= 3000 :
  → Créer "CFE - Acompte" → 15/06/N
```

### Condition 14 — DAS2
```
TOUJOURS :
  → Créer "DAS2 - Formulaire 2460 - 2 - SD"
  → Échéance :
    - SI categorieFiscale === "IS" ET 31/12 → 01/05/N+1
    - SI categorieFiscale === "IS" ET pas 31/12 → +3 mois après clôture
    - SI categorieFiscale contient "IR" → 01/05/N+1
```

### Condition 15 — TS (Taxe sur les Salaires)
```
SI nombreEmployes >= 1 ET (regimeTVA === "Exonérée de TVA" OU regimeTVA === "Franchise en base de TVA") :

  SI montantTSN1 <= 4000 :
    → Créer "TS - Formulaire 2502" → 15/01/N+1

  SI montantTSN1 > 4000 ET montantTSN1 < 10000 :
    → Créer "TS - Formulaire 2501 - SD - 1" → 15/04/N
    → Créer "TS - Formulaire 2501 - SD - 2" → 15/07/N
    → Créer "TS - Formulaire 2501 - SD - 3" → 15/10/N
    → Créer "TS - Régularisation - 2502 - SD" → 31/01/N+1

  SI montantTSN1 > 10000 :
    → Créer 11 tâches "TS - Formulaire 3310 - A - SD - {Mois}" (fév à déc) → 15 du mois suivant
    → Créer "TS - Régularisation - 2502 - SD" → 31/01/N+1
```

### Condition 16 — Taxe foncière
```
SI proprietaire === true :
  → Créer "Taxe foncière" → 30/09/N
```

### Condition 17 — TASCOM
```
SI secteur === "Commerce & Distribution" ET surfaceCommerciale >= 400 :
  → Créer "TASCOM - Formulaire 3350 - SD" → 15/06/N
```

### Condition 18 — DECLOYER
```
SI localPro === true :
  → Créer "DECLOYER"
  → Échéance : si 31/12 → 15/05/N+1 | sinon → 15 du 3ème mois après clôture
```

### Condition 19 — TSB (Taxe sur les Bureaux)
```
SI departement IN ["75","77","78","91","92","93","94","95","06","13","83"] :
  → Créer "Taxe sur les bureaux - formulaire 6705 - B" → 01/03/N
```

### Condition 20 — TVE
```
SI regimeTVA === "Franchise en base de TVA" OU "Exonérée de TVA" OU "Réel normal" :
  → Créer "TVE - Formulaire 3310 - A - SD" → 31/01/N+1

SI regimeTVA === "Régime réel simplifié (RSI)" :
  → Créer "TVE - Formulaire 3517"
  → Échéance : si 31/12 → 01/05/N+1 | sinon → +3 mois après clôture
```

### Condition 21 — TVA
```
SI regimeTVA === "Exonérée de TVA" OU "Franchise en base de TVA" → AUCUNE tâche TVA

SI regimeTVA === "Réel normal" ET frequenceTVA === "Trimestrielle" :
  → Créer 4 tâches "TVA réel normal - déclaration T{1-4}"
  → Échéances : fin de trimestre + jourTVA jours
    T1: 31/03/N + jourTVA | T2: 30/06/N + jourTVA | T3: 30/09/N + jourTVA | T4: 31/12/N + jourTVA

SI regimeTVA === "Réel normal" ET frequenceTVA === "Mensuelle" :
  → Créer 12 tâches "TVA réel normal - déclaration {mois}"
  → Échéances : dernier jour du mois + jourTVA jours
    Janvier: 31/01 + jourTVA | Février: 28/02 + jourTVA | ... | Décembre: 31/12 + jourTVA

SI regimeTVA === "Régime réel simplifié (RSI)" :
  → Créer "TVA réel simplifié - déclaration annuelle" → +3 mois après clôture
  → Créer "TVA réel simplifié - Acompte_1" → 31/07/N
  → Créer "TVA réel simplifié - Acompte_2" → 31/12/N
```

## Vue Gantt — Spécifications

### Implémentation
- Axe horizontal : timeline 12 mois (janvier → décembre de l'exercice)
- Axe vertical : une ligne par client/run
- Chaque run = une barre horizontale (dateDebut → dateFin)
- Les tâches fiscales = marqueurs (losanges ou points) sur la timeline à leur dateEcheance
- Couleur des marqueurs selon status de la tâche

### Interactions
- Hover sur marqueur → tooltip avec nom tâche + échéance + status
- Clic sur run → navigate vers /runs/[id]
- Zoom : mois, trimestre, année
- Scroll horizontal pour naviguer dans le temps

### Couleurs des status
- `a_venir` : gris clair
- `en_cours` : bleu (émeraude V7LVET)
- `en_attente` : orange/ambre
- `termine` : vert

## UI Components

### RunGanttChart
- Composant principal de la page /runs
- Accepte : runs[], taches[]
- Affiche la timeline avec les runs et leurs marqueurs de tâches
- Responsive : sur mobile, bascule vers une liste triée par date

### RunCard
- Affiche : client, exercice, status, progression
- Badge coloré pour status
- Barre de progression (tâches terminées / total)

### FiscalTaskList
- Liste des tâches fiscales d'un run
- Colonnes : Nom, Catégorie, Échéance, Status, Assigné
- Tri par défaut : dateEcheance ASC
- Badge "En retard" si dateEcheance < today ET status !== "termine"

### CreateRunDialog
- Dialog pour créer un nouveau run
- Champs : Client (Select), Exercice (Input number), Dossier (Select optionnel)
- Validation : exercice obligatoire, client obligatoire
- Après création : loading pendant la génération des tâches, puis redirect

## User Stories

### US-1: Voir la vue Gantt des runs
En tant que manager, je veux voir une vue chronologique de tous les runs de mes clients.
- [ ] La vue Gantt affiche une timeline 12 mois
- [ ] Chaque run est une barre avec le nom du client
- [ ] Les tâches fiscales sont des marqueurs sur la timeline
- [ ] Je peux filtrer par manager, status, exercice
- [ ] Les tâches en retard sont visuellement distinctes (rouge/orange)

### US-2: Créer un exercice fiscal
En tant qu'associé ou manager, je veux créer un nouveau run pour un client.
- [ ] Je sélectionne le client et l'année d'exercice
- [ ] Après création, les tâches fiscales sont générées automatiquement
- [ ] Je vois un toast de confirmation avec le nombre de tâches créées
- [ ] Je suis redirigé vers le détail du run

### US-3: Voir le détail d'un run
En tant que collaborateur, je veux voir toutes les tâches fiscales d'un run.
- [ ] La liste affiche nom, catégorie, échéance, status, assigné
- [ ] Les tâches sont triées par date d'échéance
- [ ] Les tâches en retard ont un badge "En retard"
- [ ] La progression globale est affichée (X/Y terminées)

### US-4: Régénérer les tâches
En tant qu'associé, je veux pouvoir régénérer les tâches d'un run (si les données client ont changé).
- [ ] Bouton "Régénérer" avec AlertDialog de confirmation
- [ ] Les anciennes tâches sont supprimées
- [ ] Les nouvelles sont générées avec les données client actuelles
- [ ] Toast de confirmation

## Edge Cases
- Client sans données fiscales remplies → run créé mais 0 tâche (warning toast)
- Run déjà existant pour le même client/exercice → erreur de validation
- Tâche avec échéance dépendante d'une autre (AGO → Dépôt greffe) → calculer en chaîne
- Date de clôture absente → défaut au 31/12
- jourTVA = 0 → échéance = dernier jour du mois exactement
- Année bissextile → février = 29 jours (gérer dans les calculs TVA mensuelle)

## Commit
```
feat: implement runs module with fiscal task generation engine
```
