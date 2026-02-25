# Meta-Prompt — Module Clients
> Priority: P0 | Depends on: 00-schema, 01-auth

## Context
Module de gestion des clients (entreprises). C'est le socle de l'ERP — tout est lié à un client. La fiche client contient des données d'identification, juridiques, fiscales et opérationnelles ultra-complètes. Ces données fiscales pilotent le moteur de génération de tâches fiscales (module Runs).

Seul l'admin (associé) peut créer un client. Les managers voient leur portefeuille. Les collaborateurs voient uniquement les clients des dossiers qui leur sont assignés.

## Stack
- Convex: queries, mutations
- shadcn/ui: Table, Card, Tabs, Dialog, Form, Input, Select, Badge, Separator, Skeleton
- react-hook-form + zod pour les formulaires
- Pas de bibliothèque externe supplémentaire

## Data Model
Tables concernées : `clients`, `contacts`

### clients
```typescript
clients: defineTable({
  // Identification
  raisonSociale: v.string(),
  siren: v.optional(v.string()),
  siret: v.optional(v.string()),
  adresseRue: v.optional(v.string()),
  adresseVille: v.optional(v.string()),
  adresseCodePostal: v.optional(v.string()),
  telephone: v.optional(v.string()),
  email: v.optional(v.string()),
  // Juridique
  formeJuridique: v.optional(v.string()), // SARL, SAS, SA, SASU, EI, SNC, SCI...
  activite: v.optional(v.string()), // profession libérale médicale, commerciale...
  // Fiscal
  categorieFiscale: v.optional(v.string()), // IR-BNC, IR-BIC, IR-RF, IS
  regimeFiscal: v.optional(v.string()), // réel normal, réel simplifié, micro
  regimeTVA: v.optional(v.string()), // franchise, réel normal, RSI, exonérée
  frequenceTVA: v.optional(v.string()), // mensuelle, trimestrielle, annuelle
  jourTVA: v.optional(v.number()), // jours après fin de période
  dateClotureComptable: v.optional(v.string()), // "DD/MM"
  caN1: v.optional(v.number()),
  paiementISUnique: v.optional(v.boolean()),
  // Taxes
  montantCFEN1: v.optional(v.number()),
  montantTSN1: v.optional(v.number()),
  nombreEmployes: v.optional(v.number()),
  proprietaire: v.optional(v.boolean()),
  localPro: v.optional(v.boolean()),
  secteur: v.optional(v.string()),
  surfaceCommerciale: v.optional(v.number()),
  departement: v.optional(v.string()),
  taxeFonciere: v.optional(v.boolean()),
  tve: v.optional(v.boolean()),
  // Meta
  notes: v.optional(v.string()),
  status: v.string(), // "actif" | "archivé"
  managerId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_manager", ["managerId"])
.index("by_status", ["status"])
.searchIndex("search_raison_sociale", { searchField: "raisonSociale" })
```

### contacts
```typescript
contacts: defineTable({
  clientId: v.id("clients"),
  nom: v.string(),
  prenom: v.optional(v.string()),
  email: v.optional(v.string()),
  telephone: v.optional(v.string()),
  fonction: v.optional(v.string()),
  isPrincipal: v.boolean(),
})
.index("by_client", ["clientId"])
```

## Auth & Permissions
- **Voir la liste** : tous les rôles (mais filtré par permissions cascade)
- **Voir le détail** : associé = tout | manager = ses clients | collab = clients de ses dossiers
- **Créer** : associé uniquement
- **Modifier** : associé + manager du client
- **Archiver** : associé uniquement

## Pages

### /clients — Liste des clients
- **Layout group** : (dashboard)
- **Components** : PageHeader, DataTable (shadcn Table), Badge (status), filtres
- **Data source** : `useQuery(api.clients.list)`
- **Filtres** : par status (actif/archivé), recherche par raison sociale
- **Actions** : bouton "Nouveau client" (admin only), clic ligne → détail
- **Loading** : Skeleton table (8 rows)
- **Empty** : "Aucun client. Créez votre premier client." + CTA
- **Responsive** : table scrollable horizontalement sur mobile

### /clients/[id] — Détail client
- **Layout group** : (dashboard)
- **Components** : PageHeader avec breadcrumb, Tabs, Card, ContactList
- **Tabs** :
  1. **Informations** — toutes les données de la fiche (identification, juridique, fiscal, taxes)
  2. **Contacts** — liste des contacts, ajout/modification
  3. **Dossiers** — liste des dossiers liés (lien vers module dossiers)
  4. **Runs** — liste des runs liés (lien vers module runs)
  5. **Tickets** — tickets ouverts pour ce client
  6. **Documents** — documents uploadés pour ce client
- **Actions** : Modifier (Dialog), Archiver (AlertDialog)
- **Loading** : Skeleton card + tabs

### /clients/new — Création client (Dialog ou page)
- **Components** : Form en étapes ou formulaire long avec sections
- **Sections** :
  1. Identification (raison sociale, SIREN, adresse, contact)
  2. Juridique (forme juridique, activité)
  3. Fiscal (catégorie, régime, TVA, clôture)
  4. Taxes (CFE, TS, propriétaire, etc.)
  5. Assignation (manager responsable)
- **Validation** : raison sociale obligatoire, SIREN format 9 chiffres si renseigné
- **On success** : toast + redirect vers /clients/[id]

## Convex Functions

### Queries
- `clients.list` — Liste paginée des clients visibles par l'utilisateur
  - Auth: logged in
  - Filtre par rôle: associé=tous, manager=ses clients, collab=via dossiers
  - Params: `{ status?: string, search?: string }`
  - Returns: `Client[]` avec contact principal

- `clients.getById` — Détail d'un client
  - Auth: permission de voir ce client
  - Params: `{ id: v.id("clients") }`
  - Returns: Client complet

- `contacts.listByClient` — Contacts d'un client
  - Params: `{ clientId: v.id("clients") }`

### Mutations
- `clients.create` — Créer un client
  - Auth: role "associe" uniquement
  - Params: tous les champs du client
  - Sets: createdAt, updatedAt, status="actif"
  - Returns: clientId

- `clients.update` — Modifier un client
  - Auth: associé ou manager du client
  - Params: `{ id, ...fieldsToUpdate }`
  - Sets: updatedAt

- `clients.archive` — Archiver un client
  - Auth: associé uniquement
  - Params: `{ id }`
  - Sets: status="archivé", updatedAt

- `contacts.create` — Ajouter un contact
  - Auth: associé ou manager du client
  - Params: `{ clientId, nom, prenom, email, telephone, fonction, isPrincipal }`
  - Si isPrincipal: mettre les autres contacts à isPrincipal=false

- `contacts.update` — Modifier un contact
- `contacts.delete` — Supprimer un contact

## UI Components

### ClientTable
- Colonnes: Raison sociale, Forme juridique, Catégorie fiscale, Manager, Status, Actions
- Clic sur une ligne → navigate vers /clients/[id]
- Badge coloré pour le status

### ClientForm
- Formulaire multi-sections avec react-hook-form + zod
- Selects pour: formeJuridique, categorieFiscale, regimeFiscal, regimeTVA, frequenceTVA
- Input date spécial pour dateClotureComptable (format DD/MM)
- Sections collapsibles pour ne pas submerger

### ContactCard
- Affiche nom, prénom, email, téléphone, fonction
- Badge "Principal" si isPrincipal
- Actions: modifier, supprimer

## Valeurs des selects (référence)

### formeJuridique
SARL, SAS, SA, SASU, EI, EURL, SNC, SCI, SCP, SCM, Auto-entrepreneur, Micro-entreprise

### categorieFiscale
IR - BNC, IR - BIC, IR - RF, IS

### regimeFiscal
Micro, Réel simplifié, Réel normal, Réel complet

### regimeTVA
Franchise en base de TVA, Exonérée de TVA, Réel normal, Régime réel simplifié (RSI)

### frequenceTVA
Mensuelle, Trimestrielle, Annuelle

### activite
Profession libérale médicale conventionnée, Autres professions libérales, Activité commerciale industrielle artisanale

## User Stories

### US-1: Voir la liste des clients
En tant que collaborateur, je veux voir la liste de mes clients assignés.
- [ ] La liste affiche uniquement les clients de mes dossiers
- [ ] Je peux filtrer par status (actif/archivé)
- [ ] Je peux chercher par raison sociale
- [ ] Le tableau affiche: nom, forme juridique, catégorie fiscale, manager

### US-2: Créer un client
En tant qu'associé, je veux créer un nouveau client avec toutes ses informations fiscales.
- [ ] Bouton "Nouveau client" visible uniquement pour les associés
- [ ] Formulaire avec toutes les sections (identification, juridique, fiscal, taxes)
- [ ] Raison sociale obligatoire
- [ ] Après création, redirect vers la fiche client
- [ ] Toast de confirmation

### US-3: Voir le détail d'un client
En tant que manager, je veux voir toutes les informations d'un client de mon portefeuille.
- [ ] Tabs: Informations, Contacts, Dossiers, Runs, Tickets, Documents
- [ ] L'onglet Informations affiche toutes les données fiscales
- [ ] Je peux modifier les informations si je suis le manager assigné

### US-4: Gérer les contacts
En tant que manager, je veux ajouter/modifier les contacts d'un client.
- [ ] Bouton "Ajouter un contact" dans l'onglet Contacts
- [ ] Un contact peut être marqué "Principal"
- [ ] Si je marque un contact Principal, l'ancien perd son badge

## Edge Cases
- Archiver un client avec des runs en cours → avertir (AlertDialog)
- SIREN invalide (pas 9 chiffres) → erreur de validation
- Client sans aucun contact → afficher message dans l'onglet Contacts
- Recherche vide → afficher tous les clients visibles

## Commit
```
feat: implement clients module (CRUD + contacts + permissions)
```
