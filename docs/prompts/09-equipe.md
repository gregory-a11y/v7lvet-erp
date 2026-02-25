# Meta-Prompt — Module Equipe
> Priority: P1 | Depends on: 00-schema, 01-auth

## Context
Module de gestion de l'equipe du cabinet comptable. Permet de visualiser les membres, leurs roles, leurs portefeuilles clients et leur charge de travail. La creation, modification et desactivation de comptes est reservee exclusivement a l'associe (admin). Pas d'inscription publique — les comptes sont crees via l'API admin de Better Auth.

La hierarchie en cascade definit la visibilite : l'associe voit tout, le manager voit son equipe (ses collaborateurs et assistantes rattaches), le collaborateur et l'assistante ne voient que leur propre profil.

Reference : `docs/prd.md#69-equipe`, `docs/pages.md#12-equipe`, `docs/schema-draft.ts#users`

## Stack
- Convex: queries, mutations
- Better Auth 1.4.9 + @convex-dev/better-auth (gestion des comptes utilisateurs)
- shadcn/ui: Table, Avatar, Badge, Button, Dialog, AlertDialog, Form, Input, Select, DropdownMenu, Skeleton, Card, Tabs, Separator
- react-hook-form + zod pour les formulaires
- lib/permissions.ts pour les helpers de role (hasMinRole, roleHierarchy)
- Pas de bibliotheque externe supplementaire

## Data Model
Utilise la table `users` (geree par Better Auth avec champs supplementaires metier) :

### users (existante — schema-draft.ts)
```typescript
users: defineTable({
  // Champs Better Auth (geres automatiquement)
  name: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  image: v.optional(v.string()),

  // Champs metier V7LVET
  role: v.union(
    v.literal("associe"),
    v.literal("manager"),
    v.literal("collaborateur"),
    v.literal("assistante"),
  ),
  managerId: v.optional(v.id("users")), // Manager de rattachement (hierarchie)
  isActive: v.optional(v.boolean()),     // Compte actif/desactive (defaut: true)

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_email", ["email"])
  .index("by_role", ["role"])
  .index("by_manager", ["managerId"])
```

### Relations avec les autres tables
- `clients.managerId` → `users._id` (portefeuille du manager)
- `dossiers.managerId` → `users._id` (manager du dossier)
- `dossiers.collaborateurId` → `users._id` (collaborateur assigne)
- `taches.assigneId` → `users._id` (taches assignees)
- `tickets.assigneId` → `users._id` (tickets assignes)

### Hierarchie des roles
```
associe (niveau 4) — voit tout, CRUD complet sur les users
  └─ manager (niveau 3) — voit son equipe + son portefeuille clients
       └─ collaborateur (niveau 2) — voit ses dossiers assignes
            └─ assistante (niveau 1) — acces lecture sur ses dossiers assignes
```

## Auth & Permissions
- **Voir la liste de l'equipe** : associe (tous les membres) + manager (son equipe uniquement = users dont managerId === son _id)
- **Voir le detail d'un membre** : associe (tous) + manager (son equipe)
- **Creer un utilisateur** : associe uniquement (via Better Auth admin API)
- **Modifier un utilisateur** (role, managerId, isActive) : associe uniquement
- **Desactiver un utilisateur** : associe uniquement
- **Voir son propre profil** : tous les roles
- **Modifier son propre profil** (name uniquement) : tous les roles
- **Collaborateur / Assistante** : redirection vers `/dashboard` s'ils tentent d'acceder a `/equipe`

## Pages

### /equipe — Liste de l'equipe
- **Layout group** : (dashboard)
- **Fichier** : `app/(dashboard)/equipe/page.tsx`
- **Auth** : associe + manager
- **Data source** : `useQuery(api.users.list)`
- **Composants** : PageHeader, DataTable (shadcn Table), Avatar, Badge, Button, DropdownMenu
- **Colonnes du tableau** :
  | Colonne | Description |
  |---------|-------------|
  | Membre | Avatar (initiales) + nom complet |
  | Email | Adresse email |
  | Role | Badge colore (associe=emeraude, manager=bleu, collaborateur=gris, assistante=violet) |
  | Manager | Nom du manager de rattachement (ou "—" si associe) |
  | Dossiers | Nombre de dossiers actifs assignes |
  | Charge | Barre de progression (taches actives / total taches) |
  | Statut | Badge "Actif" (vert) ou "Inactif" (gris) |
  | Actions | DropdownMenu: Modifier, Desactiver (associe uniquement) |
- **Filtres** :
  - Par role : Select avec les 4 roles + "Tous"
  - Par manager : Select avec la liste des managers + "Tous"
  - Par statut : Toggle actif/inactif (defaut: actif uniquement)
- **Bouton "Ajouter un membre"** : visible uniquement pour l'associe, ouvre CreateUserDialog
- **Clic sur une ligne** : navigate vers `/equipe/[id]`
- **Loading** : Skeleton table (4 lignes)
- **Empty** : "Aucun membre dans l'equipe" + CTA "Ajouter un membre" (associe)
- **Responsive** :
  - Desktop : tableau complet
  - Tablette : colonne Email masquee
  - Mobile : vue cards (Avatar + nom + role badge + charge barre)

### /equipe/[id] — Detail d'un membre
- **Layout group** : (dashboard)
- **Fichier** : `app/(dashboard)/equipe/[id]/page.tsx`
- **Auth** : associe (tous) + manager (son equipe)
- **Data source** : `useQuery(api.users.getById, { id })`
- **Composants** : PageHeader avec breadcrumb (Equipe > Nom), Card, Tabs, Badge, Button, Avatar

#### En-tete — Carte profil
- Avatar large (initiales ou image)
- Nom complet, email
- Badge role, badge statut
- Nom du manager de rattachement
- Date de creation du compte
- Boutons actions (associe uniquement) : "Modifier", "Desactiver"

#### Tabs
1. **Portefeuille** (si manager)
   - Liste des clients dont `managerId === user._id`
   - Colonnes : Raison sociale, Forme juridique, Categorie fiscale, Nb dossiers, Status
   - Clic sur client → navigate vers `/clients/[id]`

2. **Dossiers assignes** (si collaborateur ou assistante)
   - Liste des dossiers dont `collaborateurId === user._id`
   - Colonnes : Client, Nom du dossier, Type, Exercice, Status
   - Clic sur dossier → navigate vers `/dossiers/[id]`

3. **Charge de travail**
   - Nombre de taches actives (status !== "termine")
   - Nombre de taches en retard (dateEcheance < today ET status !== "termine")
   - Prochaines echeances (5 prochaines taches triees par dateEcheance ASC)
   - Tickets ouverts assignes a ce membre

4. **Equipe** (si manager — visible uniquement si le membre est un manager)
   - Liste des collaborateurs et assistantes rattaches a ce manager
   - Colonnes : Nom, Role, Nb dossiers, Charge
   - Clic sur membre → navigate vers `/equipe/[id]`

#### Actions (associe uniquement)
- **Modifier** : ouvre EditUserDialog (role, managerId)
- **Desactiver** : AlertDialog de confirmation "Ce membre ne pourra plus se connecter. Ses dossiers assignes devront etre reassignes." → Boutons "Annuler" / "Desactiver"

### /profil — Mon profil (tous les utilisateurs)
- **Layout group** : (dashboard)
- **Fichier** : `app/(dashboard)/profil/page.tsx` (ou via `/settings/profile`)
- **Auth** : tous les roles
- **Data source** : `useQuery(api.users.me)`
- **Composants** : Card, Form, Input, Button, Separator

#### Sections
1. **Informations personnelles**
   - Nom (editable via `users.updateProfile`)
   - Email (lecture seule — ne peut pas etre change)
   - Role (lecture seule — badge)
   - Manager de rattachement (lecture seule)

2. **Changement de mot de passe** (V2 — a implementer plus tard)
   - Champ ancien mot de passe
   - Champ nouveau mot de passe + confirmation
   - Pour le MVP : afficher "Contactez l'administrateur pour changer votre mot de passe"

3. **Mes dossiers / clients**
   - Si manager : liste de ses clients (portefeuille)
   - Si collaborateur/assistante : liste de ses dossiers assignes
   - Liens cliquables vers les fiches correspondantes

## Convex Functions

### Queries

#### `users.list` — Liste des membres de l'equipe
- **Auth** : logged in, role >= manager
- **Filtre par role cascade** :
  - Associe : tous les users
  - Manager : users dont `managerId === currentUser._id` + lui-meme
- **Params** :
  ```typescript
  {
    role?: "associe" | "manager" | "collaborateur" | "assistante",
    managerId?: Id<"users">,
    isActive?: boolean, // defaut: true
  }
  ```
- **Returns** : `User[]` enrichi avec :
  - `nbDossiers` : count des dossiers actifs assignes
  - `nbTachesActives` : count des taches non terminees
  - `managerName` : nom du manager si applicable

#### `users.getById` — Detail d'un membre avec statistiques
- **Auth** : logged in, role >= manager, cascade de visibilite
- **Params** : `{ id: v.id("users") }`
- **Returns** : User complet + :
  - `clients` : liste des clients (si manager, via `clients.by_manager`)
  - `dossiers` : liste des dossiers (via `dossiers.by_manager` ou `dossiers.by_collaborateur`)
  - `nbTachesActives` : count taches actives
  - `nbTachesEnRetard` : count taches en retard
  - `prochainesEcheances` : 5 prochaines taches triees par dateEcheance
  - `ticketsOuverts` : count tickets assignes non resolus
  - `equipe` : liste des users rattaches (si manager)

#### `users.me` — Profil de l'utilisateur connecte
- **Auth** : logged in (tous les roles)
- **Params** : aucun (utilise le userId de la session)
- **Returns** : User complet + clients/dossiers assignes

### Mutations

#### `users.createByAdmin` — Creer un utilisateur (associe uniquement)
- **Auth** : role === "associe"
- **Params** :
  ```typescript
  {
    email: v.string(),        // unique, format email valide
    password: v.string(),     // min 8 caracteres
    name: v.string(),         // nom complet (prenom + nom)
    role: v.union(v.literal("associe"), v.literal("manager"), v.literal("collaborateur"), v.literal("assistante")),
    managerId: v.optional(v.id("users")), // obligatoire si role = collaborateur ou assistante
  }
  ```
- **Logique** :
  1. Verifier que l'email n'existe pas deja
  2. Si `managerId` fourni, verifier qu'il pointe vers un user avec role >= manager
  3. Creer le compte via Better Auth admin API (`auth.api.signUpEmail` ou equivalent)
  4. Mettre a jour les champs metier (role, managerId, isActive=true)
  5. Retourner le userId cree
- **Erreurs** :
  - `"EMAIL_ALREADY_EXISTS"` si email deja pris
  - `"INVALID_MANAGER"` si managerId invalide ou pointe vers un role < manager
  - `"UNAUTHORIZED"` si l'appelant n'est pas associe

#### `users.update` — Modifier un utilisateur (associe uniquement)
- **Auth** : role === "associe"
- **Params** :
  ```typescript
  {
    id: v.id("users"),
    role?: v.union(v.literal("associe"), v.literal("manager"), v.literal("collaborateur"), v.literal("assistante")),
    managerId?: v.optional(v.id("users")),
    isActive?: v.boolean(),
  }
  ```
- **Logique** :
  1. Verifier que le user cible existe
  2. Si changement de role : verifier les contraintes (cf. edge cases)
  3. Si changement de managerId : verifier que le nouveau manager est valide
  4. Mettre a jour `updatedAt`
- **Erreurs** :
  - `"USER_NOT_FOUND"` si id invalide
  - `"CANNOT_DEMOTE_LAST_ASSOCIE"` si on tente de changer le role du dernier associe
  - `"UNAUTHORIZED"` si l'appelant n'est pas associe

#### `users.updateProfile` — Modifier son propre profil
- **Auth** : logged in (tous les roles)
- **Params** :
  ```typescript
  {
    name: v.string(), // seul champ modifiable par l'utilisateur
  }
  ```
- **Logique** :
  1. Met a jour le `name` du user connecte
  2. Met a jour `updatedAt`
  3. Pas de changement de role, email ou managerId possible

#### `users.deactivate` — Desactiver un utilisateur (associe uniquement)
- **Auth** : role === "associe"
- **Params** : `{ id: v.id("users") }`
- **Logique** :
  1. Verifier que le user n'est pas le dernier associe actif
  2. Mettre `isActive = false`, `updatedAt = Date.now()`
  3. NE PAS supprimer les donnees (dossiers, taches, historique restent intacts)
  4. L'utilisateur desactive ne peut plus se connecter

## Zod Schemas (validation formulaires)

```typescript
// Schema de creation d'un utilisateur
const createUserSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
  role: z.enum(["associe", "manager", "collaborateur", "assistante"]),
  managerId: z.string().optional(),
})

// Schema de modification d'un utilisateur
const updateUserSchema = z.object({
  role: z.enum(["associe", "manager", "collaborateur", "assistante"]).optional(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

// Schema de modification du profil
const updateProfileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
})
```

## UI Components

### TeamTable
- Tableau de la liste des membres de l'equipe
- Colonnes : Membre (Avatar + nom), Email, Role (Badge), Manager, Dossiers, Charge, Statut, Actions
- Clic sur une ligne → navigate vers `/equipe/[id]`
- DropdownMenu par ligne (Modifier, Desactiver) visible uniquement pour l'associe
- Tri par defaut : role (associe en premier) puis nom alphabetique
- Badge colore pour le role :
  - `associe` → emeraude (couleur V7LVET)
  - `manager` → bleu
  - `collaborateur` → gris
  - `assistante` → violet
- Badge statut : "Actif" (vert) / "Inactif" (gris, texte barre)
- Barre de charge : pourcentage de taches actives vs capacite (indicateur visuel simple)

### TeamMemberCard
- Carte detail d'un membre pour la page `/equipe/[id]`
- Avatar large + nom + email + badges (role, statut)
- Infos hierarchiques : manager de rattachement
- Stats rapides : nb dossiers, nb taches actives, nb taches en retard
- Utilise sur la page detail et en vue mobile (liste)

### CreateUserDialog
- Dialog shadcn/ui pour la creation d'un utilisateur
- Formulaire react-hook-form + zod (createUserSchema)
- Champs :
  - Nom complet (`Input` text, requis)
  - Email (`Input` email, requis)
  - Mot de passe (`Input` password, requis, min 8 chars)
  - Role (`Select` avec les 4 roles)
  - Manager de rattachement (`Select` avec la liste des managers, conditionnel — visible si role = collaborateur ou assistante)
- On submit : appelle `api.users.createByAdmin`
- On success : toast de confirmation + fermeture du dialog + invalidation du cache query
- On error : toast d'erreur avec message specifique

### EditUserDialog
- Dialog shadcn/ui pour la modification d'un utilisateur
- Formulaire react-hook-form + zod (updateUserSchema)
- Champs pre-remplis : role actuel, managerId actuel
- Nom et email affiches en lecture seule (non modifiables)
- On submit : appelle `api.users.update`
- On success : toast + fermeture + invalidation

### UserProfileCard
- Carte pour la page `/profil`
- Affiche les infos du user connecte
- Formulaire inline pour modifier le nom
- Section "Mes dossiers/clients" avec liens cliquables
- Section mot de passe desactivee pour le MVP (message d'information)

### DeactivateUserAlert
- AlertDialog shadcn/ui
- Message : "Ce membre ne pourra plus se connecter. Ses dossiers assignes devront etre reassignes."
- Boutons : "Annuler" (variant outline) / "Desactiver" (variant destructive)
- On confirm : appelle `api.users.deactivate`
- On success : toast + redirect vers `/equipe`

## User Stories

### US-1 : Voir la liste de l'equipe
En tant qu'associe, je veux voir tous les membres du cabinet avec leurs roles et leur charge.
- [ ] Le tableau affiche tous les utilisateurs (actifs par defaut)
- [ ] Je peux filtrer par role (associe, manager, collaborateur, assistante)
- [ ] Je peux filtrer par manager de rattachement
- [ ] Je peux basculer l'affichage pour inclure les membres inactifs
- [ ] Chaque ligne affiche : avatar, nom, email, role, manager, nb dossiers, charge, statut
- [ ] Je peux cliquer sur un membre pour voir son detail

### US-2 : Creer un nouveau membre
En tant qu'associe, je veux ajouter un nouveau collaborateur au cabinet.
- [ ] Bouton "Ajouter un membre" visible uniquement pour les associes
- [ ] Dialog avec formulaire : nom, email, mot de passe, role, manager
- [ ] Le champ manager est conditionnel (visible si role = collaborateur ou assistante)
- [ ] Validation : email unique, mot de passe >= 8 caracteres, nom >= 2 caracteres
- [ ] Apres creation : toast de confirmation, le nouveau membre apparait dans la liste
- [ ] Le nouveau membre peut se connecter immediatement avec ses identifiants

### US-3 : Modifier un membre
En tant qu'associe, je veux modifier le role ou le manager d'un membre existant.
- [ ] Bouton "Modifier" dans le DropdownMenu de la ligne ou sur la page detail
- [ ] Dialog pre-rempli avec les valeurs actuelles
- [ ] Je peux changer le role (avec confirmation si changement impactant)
- [ ] Je peux changer le manager de rattachement
- [ ] Apres modification : toast de confirmation, la liste se rafraichit

### US-4 : Desactiver un membre
En tant qu'associe, je veux desactiver le compte d'un collaborateur qui quitte le cabinet.
- [ ] Bouton "Desactiver" dans le DropdownMenu ou sur la page detail
- [ ] AlertDialog de confirmation avec avertissement sur les dossiers assignes
- [ ] Le membre desactive passe en statut "Inactif" dans la liste
- [ ] Le membre desactive ne peut plus se connecter
- [ ] Les donnees du membre (dossiers, taches, historique) sont conservees

### US-5 : Voir mon profil
En tant que collaborateur, je veux consulter et modifier mon profil.
- [ ] Je vois mon nom, email, role, manager
- [ ] Je peux modifier mon nom
- [ ] Je ne peux pas modifier mon email, role ou manager
- [ ] Je vois la liste de mes dossiers/clients assignes
- [ ] Le changement de mot de passe affiche "Contactez l'administrateur" (MVP)

### US-6 : Voir le detail d'un membre (manager)
En tant que manager, je veux voir le profil et la charge d'un collaborateur de mon equipe.
- [ ] Je vois uniquement les membres dont je suis le manager
- [ ] Je vois le portefeuille / dossiers assignes du membre
- [ ] Je vois sa charge de travail (taches actives, en retard, prochaines echeances)
- [ ] Je ne peux pas modifier son profil (lecture seule)

## Edge Cases

### Desactiver un utilisateur avec des taches/dossiers actifs
- Afficher un avertissement dans l'AlertDialog : "Ce membre a X dossiers actifs et Y taches en cours. Ils devront etre reassignes."
- NE PAS empecher la desactivation — l'associe prend la responsabilite de reassigner
- Les taches et dossiers restent assignes a l'utilisateur desactive (visible dans les filtres)
- Ajouter un indicateur visuel (badge "Inactif") sur les taches/dossiers assignes a un user desactive

### Changer le manager d'un collaborateur
- Mettre a jour `managerId` sur le user
- Les dossiers et taches deja assignes restent intacts (pas de reassignation automatique)
- Le collaborateur apparait desormais dans l'equipe du nouveau manager

### Changer le role d'un manager en collaborateur
- Verifier si le manager a des collaborateurs rattaches
- Si oui : afficher un avertissement "Ce manager a X collaborateurs rattaches. Leur manager devra etre reassigne."
- Mettre `managerId = null` sur les collaborateurs orphelins OU demander a l'associe de les reassigner d'abord

### Protection du dernier associe
- Empecher la desactivation du dernier associe actif
- Empecher le changement de role du dernier associe actif
- Message d'erreur : "Impossible de modifier le dernier associe actif du cabinet."
- Verifier via query : `users.filter(u => u.role === "associe" && u.isActive).length > 1`

### Email en double
- Verifier l'unicite de l'email avant creation
- Message d'erreur specifique : "Un compte avec cet email existe deja."
- Better Auth gere cette contrainte cote serveur, mais la valider aussi cote client pour UX

### Utilisateur desactive qui tente de se connecter
- Better Auth doit verifier le champ `isActive` lors du login
- Si `isActive === false` : retourner une erreur "Votre compte a ete desactive. Contactez l'administrateur."
- NE PAS reveler si l'email existe ou non (message generique si email inconnu)

### Manager sans equipe
- Un manager peut ne pas avoir de collaborateurs rattaches (equipe vide)
- L'onglet "Equipe" sur sa fiche affiche : "Aucun collaborateur rattache a ce manager."
- Ca n'est pas une erreur — le manager peut gerer son portefeuille seul

## Commit
```
feat: implement team management module (CRUD + roles + portfolios)
```
