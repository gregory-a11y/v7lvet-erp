# V7LVET ERP -- Page Tree

> Document de reference pour toutes les pages de l'application.
> Stack : Next.js 16 App Router, Convex, Better Auth, shadcn/ui, Tailwind CSS, Recharts, Framer Motion.
> Mode : Light only. Fonts : Cabin (titres), Inter (corps), Geist Mono (code/nombres).

---

## Table des matieres

1. [Architecture des layouts](#architecture-des-layouts)
2. [Roles et permissions](#roles-et-permissions)
3. [Sidebar & Navigation](#sidebar--navigation)
4. [Pages](#pages)
   - [1. /login](#1-login)
   - [2. /dashboard](#2-dashboard)
   - [3. /clients](#3-clients)
   - [4. /clients/[id]](#4-clientsid)
   - [5. /clients/new](#5-clientsnew)
   - [6. /dossiers](#6-dossiers)
   - [7. /dossiers/[id]](#7-dossiersid)
   - [8. /runs](#8-runs)
   - [9. /runs/[id]](#9-runsid)
   - [10. /tickets](#10-tickets)
   - [11. /tickets/[id]](#11-ticketsid)
   - [12. /equipe](#12-equipe)
   - [13. /documents](#13-documents)
   - [14. /settings](#14-settings)
   - [15. /settings/profile](#15-settingsprofile)
   - [16. /notifications](#16-notifications)
5. [Composants partages](#composants-partages)
6. [Patterns recurrents](#patterns-recurrents)

---

## Architecture des layouts

```
app/
  layout.tsx                    # Root layout (fonts, Providers, Toaster)
  page.tsx                      # Redirect : auth ? /dashboard : /login
  providers.tsx                 # ConvexBetterAuthProvider + Toaster
  globals.css                   # Theme V7LVET (light only)

  (auth)/
    layout.tsx                  # Centrage vertical, pas de sidebar
    login/
      page.tsx                  # Page de connexion

  (dashboard)/
    layout.tsx                  # Sidebar + header + main content area
    dashboard/
      page.tsx
    clients/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx
    dossiers/
      page.tsx
      [id]/
        page.tsx
    runs/
      page.tsx
      [id]/
        page.tsx
    tickets/
      page.tsx
      [id]/
        page.tsx
    equipe/
      page.tsx
    documents/
      page.tsx
    settings/
      page.tsx
      profile/
        page.tsx
    notifications/
      page.tsx
```

### Layout `(auth)`

- Aucun element de navigation (pas de sidebar, pas de header)
- Fond `bg-background` (#F4F5F3), contenu centre verticalement et horizontalement
- Pas de verification d'authentification (page publique)

### Layout `(dashboard)`

- **Sidebar** collapsible a gauche (couleur `--sidebar` : Ocan Profond #063238)
- **Header** en haut : breadcrumb, barre de recherche globale (Command Palette), avatar utilisateur + dropdown
- **Main** : zone de contenu scrollable avec `padding` adaptatif
- Verification d'authentification cote serveur (`auth-server.ts`) : redirection vers `/login` si non authentifie
- Injection du role utilisateur dans le contexte React pour le filtrage cote client

---

## Roles et permissions

| Permission                        | Associe | Manager | Collaborateur | Assistante |
|-----------------------------------|---------|---------|---------------|------------|
| Voir le dashboard complet (KPIs)  | oui     | oui     | limite        | limite     |
| Voir tous les clients             | oui     | equipe  | assignes      | assignes   |
| Creer un client                   | oui     | non     | non           | non        |
| Voir tous les dossiers            | oui     | equipe  | assignes      | assignes   |
| Creer/modifier un dossier         | oui     | oui     | non           | non        |
| Voir tous les runs                | oui     | equipe  | assignes      | lecture    |
| Gerer les gates (validation)      | oui     | oui     | non           | non        |
| Voir tous les tickets             | oui     | equipe  | assignes      | assignes   |
| Creer un ticket                   | oui     | oui     | oui           | oui        |
| Voir l'equipe                     | oui     | oui     | non           | non        |
| Gerer l'equipe (CRUD)             | oui     | non     | non           | non        |
| Voir tous les documents           | oui     | equipe  | assignes      | assignes   |
| Uploader un document              | oui     | oui     | oui           | oui        |
| Acceder aux settings              | oui     | non     | non           | non        |
| Modifier son profil               | oui     | oui     | oui           | oui        |
| Voir les notifications            | oui     | oui     | oui           | oui        |

> **Cascade** : chaque role herite des permissions du role inferieur. L'Associe voit tout. Le Manager voit les dossiers de son equipe. Le Collaborateur ne voit que ses dossiers assignes. L'Assistante a un acces en lecture seule sur les dossiers assignes.

---

## Sidebar & Navigation

### Structure

```
Sidebar (collapsible)
  Logo V7LVET (v7-emeraude.svg)           # collapsed: lettermark seul
  ---
  Dashboard          (LayoutDashboard)
  Clients            (Users)
  Dossiers           (FolderOpen)
  Runs               (Play)
  Tickets            (MessageSquare)
  Equipe             (UsersRound)          # visible: Associe, Manager
  Documents          (FileText)
  ---
  Settings           (Settings)            # visible: Associe
  ---
  User card (avatar + nom + role)          # collapsed: avatar seul
    > Mon profil
    > Notifications (badge count)
    > Deconnexion
```

### Comportement

- **Desktop** (>= 1024px) : sidebar ouverte par defaut, collapsible via bouton chevron. Etat persiste dans `localStorage`.
- **Tablette** (768-1023px) : sidebar collapsed par defaut (icones seules), extensible au hover ou clic.
- **Mobile** (< 768px) : sidebar masquee, accessible via `Sheet` (slide-in depuis la gauche). Bouton hamburger dans le header.
- Les elements de navigation non autorises pour le role courant ne sont pas rendus dans le DOM (pas de `display: none`, pas de rendu du tout).
- L'element actif est mis en surbrillance avec `bg-sidebar-accent` et un trait vertical `border-left: 3px solid var(--sidebar-primary)`.
- Icones : **Lucide React**. Taille 20px en mode etendu, 24px en mode collapsed.

### Composants

- `components/shared/sidebar.tsx` -- composant principal
- `components/shared/sidebar-nav-item.tsx` -- element de navigation individuel
- `components/shared/sidebar-user-card.tsx` -- carte utilisateur en bas
- `components/shared/header.tsx` -- header avec breadcrumb + search + avatar
- `components/shared/command-palette.tsx` -- recherche globale (Cmd+K)

---

## Pages

---

### 1. /login

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/login`                                             |
| **Fichier**     | `app/(auth)/login/page.tsx`                          |
| **Layout group**| `(auth)`                                             |
| **Auth**        | Non requise (page publique)                          |
| **Roles**       | Tous (pre-authentification)                          |

#### Description

Page de connexion a l'ERP V7LVET. Formulaire centre avec le logo, un champ email, un champ mot de passe et un bouton de connexion. Pas de lien d'inscription (les comptes sont crees par l'Associe dans Settings ou Equipe). Pas de lien "Mot de passe oublie" en V1 (a ajouter en V2).

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Card`             | shadcn/ui    | Conteneur du formulaire                          |
| `CardHeader`       | shadcn/ui    | Logo + titre "Connexion"                         |
| `CardContent`      | shadcn/ui    | Corps du formulaire                              |
| `Form`             | shadcn/ui    | Wrapper react-hook-form                          |
| `FormField`        | shadcn/ui    | Champs email et mot de passe                     |
| `Input`            | shadcn/ui    | Champs de saisie                                 |
| `Label`            | shadcn/ui    | Labels des champs                                |
| `Button`           | shadcn/ui    | Bouton "Se connecter"                            |
| `Sonner (toast)`   | shadcn/ui    | Notification d'erreur en cas d'echec             |

#### Schema de validation (Zod)

```ts
const loginSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "Mot de passe requis"),
})
```

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Default**  | Formulaire vide, bouton "Se connecter" actif                                          |
| **Loading**  | Bouton desactive avec `Spinner` + texte "Connexion...", champs disabled                |
| **Error**    | Toast Sonner rouge en bas a droite : "Email ou mot de passe incorrect"                 |
| **Success**  | Redirect vers `/dashboard` via `router.push`                                           |

#### Responsive

- **Desktop** : `Card` centree, `max-w-sm`
- **Mobile** : `Card` pleine largeur avec `mx-4`, memes champs, bouton full-width

#### Interactions

- Soumission avec Enter ou clic sur le bouton
- Les erreurs de validation Zod s'affichent inline sous chaque champ (`FormMessage`)
- Si l'utilisateur est deja connecte et accede a `/login`, il est redirige vers `/dashboard`

---

### 2. /dashboard

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/dashboard`                                         |
| **Fichier**     | `app/(dashboard)/dashboard/page.tsx`                 |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (contenu adapte selon le role)                  |

#### Description

Tableau de bord principal. Vue synthetique de l'activite du cabinet : KPIs cles en haut, timeline des echeances a venir au centre, et performance de l'equipe en bas. Le contenu affiche est filtre selon le role de l'utilisateur.

#### Sections

**1. Barre de KPIs (grille de 4 cards)**

| KPI                         | Icone           | Description                              |
|-----------------------------|-----------------|------------------------------------------|
| Clients actifs              | Users           | Nombre total de clients actifs           |
| Dossiers en cours           | FolderOpen      | Dossiers dont le statut != "cloture"     |
| Runs actifs                 | Play            | Runs en cours d'execution                |
| Tickets ouverts             | MessageSquare   | Tickets non resolus                      |

- Chaque card affiche la valeur, un delta par rapport au mois precedent (fleche verte/rouge + pourcentage), et une micro spark-line (Recharts `AreaChart` en miniature).

**2. Timeline des echeances (centre)**

- Liste chronologique des 10 prochaines echeances fiscales et administratives.
- Chaque echeance affiche : date, intitule, client concerne, statut (`a_faire`, `en_cours`, `termine`).
- Badge de couleur selon le delai restant : vert (> 15 jours), orange (5-15 jours), rouge (< 5 jours).
- Clic sur une echeance : navigation vers le run associe (`/runs/[id]`).

**3. Performance equipe (bas) -- visible uniquement pour Associe et Manager**

- Graphique en barres horizontales (Recharts `BarChart`) : nombre de dossiers traites par collaborateur sur le mois en cours.
- Tableau compact : collaborateur, dossiers termines, dossiers en retard, taux de completion.

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Card`             | shadcn/ui    | Conteneur de chaque KPI                          |
| `Badge`            | shadcn/ui    | Statut des echeances, delais                     |
| `Table`            | shadcn/ui    | Tableau performance equipe                       |
| `Skeleton`         | shadcn/ui    | Loading state de chaque section                  |
| `Separator`        | shadcn/ui    | Separation entre sections                        |
| `AreaChart`        | Recharts     | Sparklines dans les KPI cards                    |
| `BarChart`         | Recharts     | Performance equipe                               |
| `Tabs`             | shadcn/ui    | Onglets "Ce mois" / "Ce trimestre" / "Annee"    |

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | 4 `Skeleton` rectangulaires pour les KPIs, `Skeleton` lignes pour la timeline         |
| **Empty**    | Message "Aucune echeance a venir" avec illustration. CTA "Voir les dossiers"          |
| **Error**    | Card d'erreur avec icone `AlertTriangle`, message, bouton "Reessayer"                 |
| **Data**     | Contenu reel affiche                                                                  |

#### Responsive

- **Desktop** : grille 4 colonnes pour les KPIs, timeline et graphique cote a cote en 2 colonnes
- **Tablette** : grille 2 colonnes pour les KPIs, timeline et graphique empiles
- **Mobile** : grille 1 colonne pour les KPIs, tout empile, graphique scrollable horizontalement

---

### 3. /clients

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/clients`                                           |
| **Fichier**     | `app/(dashboard)/clients/page.tsx`                   |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (donnees filtrees selon le role)                |

#### Description

Liste de tous les clients du cabinet, presentee sous forme de tableau filtrable et triable. L'Associe voit tous les clients, le Manager voit les clients de son equipe, le Collaborateur et l'Assistante ne voient que les clients dont ils sont responsables.

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Table`            | shadcn/ui    | Tableau principal                                |
| `Input`            | shadcn/ui    | Barre de recherche                               |
| `Button`           | shadcn/ui    | "Nouveau client" (Associe uniquement)            |
| `Badge`            | shadcn/ui    | Statut du client (actif, inactif, prospect)      |
| `DropdownMenu`     | shadcn/ui    | Actions par ligne (voir, modifier, archiver)     |
| `Skeleton`         | shadcn/ui    | Loading state                                    |
| `Avatar`           | shadcn/ui    | Initiales du client dans la premiere colonne     |
| `Popover`          | shadcn/ui    | Filtres avances (statut, responsable, date)      |

#### Colonnes du tableau

| Colonne         | Description                         | Triable |
|-----------------|-------------------------------------|---------|
| Nom             | Raison sociale ou nom personne      | oui     |
| SIREN           | Numero SIREN                        | non     |
| Type            | Personne morale / physique          | oui     |
| Responsable     | Collaborateur assigne               | oui     |
| Dossiers actifs | Nombre de dossiers en cours         | oui     |
| Statut          | Badge : actif, inactif, prospect    | oui     |
| Actions         | Dropdown : voir, modifier, archiver | non     |

#### Filtres

- **Recherche textuelle** : filtre instantane sur nom, SIREN
- **Statut** : multi-select (actif, inactif, prospect)
- **Responsable** : select du collaborateur
- Les filtres sont combines (AND)
- Les filtres actifs sont affiches sous la barre de recherche sous forme de `Badge` supprimables

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` pour chaque ligne du tableau (8 lignes), header reel visible               |
| **Empty**    | Illustration + "Aucun client pour le moment" + CTA "Ajouter un client" (si autorise)  |
| **No match** | "Aucun resultat pour cette recherche" + CTA "Reinitialiser les filtres"               |
| **Error**    | Banniere d'erreur en haut du tableau + bouton "Reessayer"                             |

#### Responsive

- **Desktop** : tableau complet avec toutes les colonnes
- **Tablette** : colonnes SIREN et Type masquees
- **Mobile** : vue en liste (cards empilees) au lieu du tableau. Chaque card affiche : nom, statut (badge), responsable, chevron pour ouvrir

#### Interactions

- Clic sur une ligne : navigation vers `/clients/[id]`
- Bouton "Nouveau client" : navigation vers `/clients/new` (visible uniquement pour l'Associe)
- Tri par colonne : clic sur le header de colonne (toggle asc/desc)
- Pagination : infinite scroll ou pagination classique en bas

---

### 4. /clients/[id]

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/clients/[id]`                                      |
| **Fichier**     | `app/(dashboard)/clients/[id]/page.tsx`              |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (acces filtre par role)                         |

#### Description

Fiche detaillee d'un client. Affiche les informations generales en en-tete, puis un systeme d'onglets pour naviguer entre les differentes sections liees au client.

#### En-tete (toujours visible)

- **Nom du client** (titre h1, Cabin Bold uppercase)
- **Badges** : statut (actif/inactif), type (PM/PP)
- **Responsable** : avatar + nom du collaborateur assigne
- **Actions rapides** : bouton "Modifier" (Dialog), bouton "Archiver" (AlertDialog de confirmation)

#### Onglets

| Onglet      | Contenu                                                                    |
|-------------|----------------------------------------------------------------------------|
| Informations| Donnees legales, adresse, contacts, informations fiscales                 |
| Dossiers    | Liste des dossiers du client (sous-tableau)                               |
| Runs        | Historique des runs lies au client                                        |
| Tickets     | Tickets ouverts et fermes pour ce client                                  |
| Documents   | Documents uploades et generes pour ce client                              |

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Tabs`             | shadcn/ui    | Navigation entre sections                        |
| `Card`             | shadcn/ui    | Conteneur de chaque bloc d'informations          |
| `Badge`            | shadcn/ui    | Statut, type                                     |
| `Avatar`           | shadcn/ui    | Responsable                                      |
| `Table`            | shadcn/ui    | Sous-tableaux (dossiers, runs, tickets)          |
| `Dialog`           | shadcn/ui    | Edition des informations client                  |
| `AlertDialog`      | shadcn/ui    | Confirmation d'archivage                         |
| `Form`             | shadcn/ui    | Formulaire d'edition dans le Dialog              |
| `Separator`        | shadcn/ui    | Separation entre groupes de champs               |
| `Skeleton`         | shadcn/ui    | Loading state par onglet                         |
| `DropdownMenu`     | shadcn/ui    | Menu d'actions en haut a droite                  |

#### Onglet "Informations" -- Detail des champs

| Groupe            | Champs                                                    |
|-------------------|-----------------------------------------------------------|
| Identite          | Raison sociale, SIREN, SIRET, forme juridique, NAF       |
| Adresse           | Rue, CP, Ville, Pays                                     |
| Contacts          | Nom, prenom, email, telephone, role dans l'entreprise    |
| Fiscal            | Regime TVA, regime IS/IR, exercice comptable (debut/fin)  |
| Notes             | Zone de texte libre                                      |

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | En-tete : `Skeleton` pour le nom et les badges. Onglets : `Skeleton` selon l'onglet   |
| **Not found**| Page 404 personnalisee : "Client introuvable" + CTA "Retour a la liste"               |
| **Error**    | Banniere d'erreur + bouton "Reessayer"                                                |
| **Empty tab**| Chaque onglet a son propre empty state (ex: "Aucun dossier" + CTA "Creer un dossier")|

#### Responsive

- **Desktop** : en-tete + onglets horizontaux
- **Tablette** : meme layout, les sous-tableaux perdent des colonnes secondaires
- **Mobile** : en-tete empile, onglets scrollables horizontalement, sous-tableaux deviennent des listes de cards

#### Interactions

- **Modifier client** : clic sur "Modifier" ouvre un `Dialog` avec le formulaire pre-rempli. Validation Zod. Toast de succes/erreur.
- **Archiver client** : `AlertDialog` "Etes-vous sur de vouloir archiver ce client ? Cette action est reversible." Boutons "Annuler" / "Archiver".
- **Navigation onglet** : les onglets utilisent des query params (`?tab=dossiers`) pour permettre le deep linking.
- **Clic sur un sous-element** : navigation vers la page de detail correspondante (`/dossiers/[id]`, `/runs/[id]`, etc.)

---

### 5. /clients/new

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/clients/new`                                       |
| **Fichier**     | `app/(dashboard)/clients/new/page.tsx`               |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Associe uniquement                                   |

#### Description

Formulaire de creation d'un nouveau client. Formulaire multi-sections (pas de stepper, une seule page scrollable) reprenant les memes groupes de champs que l'onglet "Informations" de la fiche client.

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Card`             | shadcn/ui    | Conteneur de chaque section du formulaire        |
| `Form`             | shadcn/ui    | Wrapper react-hook-form + Zod                    |
| `FormField`        | shadcn/ui    | Chaque champ du formulaire                       |
| `Input`            | shadcn/ui    | Champs texte                                     |
| `Label`            | shadcn/ui    | Labels                                           |
| `Button`           | shadcn/ui    | "Enregistrer" + "Annuler"                        |
| `Separator`        | shadcn/ui    | Separation entre sections                        |
| `Popover`+`Command`| shadcn/ui   | Combobox pour la selection du responsable         |

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Default**  | Formulaire vide, bouton "Enregistrer" actif                                           |
| **Loading**  | Bouton "Enregistrer" desactive + spinner, champs disabled                             |
| **Error**    | Erreurs de validation inline (FormMessage). Toast Sonner si erreur serveur            |
| **Success**  | Toast "Client cree avec succes" + redirection vers `/clients/[newId]`                 |

#### Responsive

- **Desktop** : formulaire en 2 colonnes dans les sections larges (identite, adresse)
- **Mobile** : tout en 1 colonne, boutons d'action sticky en bas de l'ecran

#### Interactions

- Bouton "Annuler" : `AlertDialog` si le formulaire a ete modifie ("Quitter sans enregistrer ?"), sinon retour a `/clients`
- La validation se fait a la soumission (pas de validation en temps reel sauf format email)
- Le champ SIREN propose une verification de format (9 chiffres)

---

### 6. /dossiers

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/dossiers`                                          |
| **Fichier**     | `app/(dashboard)/dossiers/page.tsx`                  |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (donnees filtrees selon le role)                |

#### Description

Liste de tous les dossiers comptables du cabinet. Un dossier represente un exercice comptable pour un client donne (ex: "SARL Dupont -- Exercice 2025"). Le tableau permet de filtrer par client, statut, responsable et exercice.

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Table`            | shadcn/ui    | Tableau principal                                |
| `Input`            | shadcn/ui    | Recherche textuelle                              |
| `Button`           | shadcn/ui    | "Nouveau dossier" (Associe, Manager)             |
| `Badge`            | shadcn/ui    | Statut du dossier                                |
| `DropdownMenu`     | shadcn/ui    | Actions par ligne                                |
| `Popover`          | shadcn/ui    | Filtres avances                                  |
| `Skeleton`         | shadcn/ui    | Loading state                                    |
| `Avatar`           | shadcn/ui    | Responsable assigne                              |

#### Colonnes du tableau

| Colonne         | Description                                    | Triable |
|-----------------|------------------------------------------------|---------|
| Reference       | Code du dossier (ex: DOS-2025-001)             | oui     |
| Client          | Nom du client associe                          | oui     |
| Exercice        | Periode (ex: 01/01/2025 - 31/12/2025)         | oui     |
| Responsable     | Collaborateur assigne                          | oui     |
| Progression     | Barre de progression (% des runs termines)     | oui     |
| Statut          | Badge : ouvert, en_cours, en_revue, cloture    | oui     |
| Actions         | Dropdown : voir, modifier, cloturer            | non     |

#### Filtres

- **Recherche textuelle** : sur reference, nom du client
- **Statut** : multi-select
- **Client** : combobox searchable
- **Responsable** : select
- **Exercice** : select d'annee

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` lignes du tableau (6 lignes)                                               |
| **Empty**    | "Aucun dossier" + CTA "Creer un dossier" (si autorise)                               |
| **No match** | "Aucun resultat" + CTA "Reinitialiser les filtres"                                   |
| **Error**    | Banniere d'erreur + "Reessayer"                                                      |

#### Responsive

- **Desktop** : tableau complet
- **Tablette** : colonnes Reference et Exercice masquees
- **Mobile** : vue cards empilees (client, statut badge, progression barre, responsable)

#### Interactions

- Clic sur une ligne : navigation vers `/dossiers/[id]`
- "Nouveau dossier" : `Dialog` avec formulaire (selection client, exercice, responsable). Visible pour Associe et Manager.
- Le Dialog de creation propose un template de runs par defaut (modifiable dans Settings)

---

### 7. /dossiers/[id]

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/dossiers/[id]`                                     |
| **Fichier**     | `app/(dashboard)/dossiers/[id]/page.tsx`             |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (acces filtre par role)                         |

#### Description

Detail d'un dossier comptable. Vue centree sur les runs et les taches associees a ce dossier. L'en-tete affiche les informations cles du dossier, et le corps principal montre les runs avec leur progression.

#### En-tete

- **Reference** du dossier + **Client** (lien vers `/clients/[id]`)
- **Exercice** : dates de debut et fin
- **Responsable** : avatar + nom
- **Statut** : badge editable (Associe/Manager uniquement)
- **Progression globale** : barre de progression avec pourcentage

#### Corps principal

**Liste des runs** (ordonnes chronologiquement)

Chaque run est affiche dans une `Card` avec :
- Nom du run (ex: "TVA T1 2025", "Bilan annuel 2025")
- Type (fiscal, operationnel)
- Date d'echeance
- Statut (badge)
- Progression (barre)
- Nombre de taches terminees / total
- Lien vers `/runs/[id]`

**Section "Taches rapides"** (panneau lateral ou section sous les runs)
- Liste des taches les plus urgentes du dossier (echeance proche, non terminees)
- Checkbox pour marquer une tache comme terminee sans quitter la page

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Card`             | shadcn/ui    | Chaque run, en-tete                              |
| `Badge`            | shadcn/ui    | Statut dossier, statut runs                      |
| `Avatar`           | shadcn/ui    | Responsable                                      |
| `Button`           | shadcn/ui    | "Ajouter un run", "Modifier le dossier"          |
| `Dialog`           | shadcn/ui    | Creation/edition de run                          |
| `AlertDialog`      | shadcn/ui    | Confirmation de cloture                          |
| `Separator`        | shadcn/ui    | Entre sections                                   |
| `Skeleton`         | shadcn/ui    | Loading state                                    |

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` pour l'en-tete + `Skeleton` cards pour les runs                            |
| **Not found**| "Dossier introuvable" + CTA "Retour a la liste"                                      |
| **No runs**  | "Aucun run associe a ce dossier" + CTA "Creer un run"                                |
| **Error**    | Banniere d'erreur + "Reessayer"                                                      |

#### Responsive

- **Desktop** : en-tete horizontal + grille de runs (2 colonnes) + taches rapides en sidebar droite
- **Tablette** : runs en 1 colonne, taches rapides sous les runs
- **Mobile** : tout empile, cards des runs simplifiees

#### Interactions

- **Ajouter un run** : `Dialog` avec formulaire (nom, type, echeance, taches predefinies selon template). Associe/Manager uniquement.
- **Cloturer le dossier** : `AlertDialog` "Tous les runs doivent etre termines pour cloturer." Verification automatique.
- **Marquer une tache** : checkbox dans "Taches rapides", mise a jour optimistic via Convex.
- **Clic sur un run** : navigation vers `/runs/[id]`.

---

### 8. /runs

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/runs`                                              |
| **Fichier**     | `app/(dashboard)/runs/page.tsx`                      |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (donnees filtrees selon le role)                |

#### Description

Vue globale de tous les runs en cours a travers tous les clients et dossiers. **Vue primaire : Gantt Chart**. Vue secondaire : tableau classique. Permet d'avoir une vision d'ensemble de la charge de travail et des echeances.

#### Vue Gantt (primaire)

- Axe X : timeline (jours/semaines/mois, zoomable)
- Axe Y : chaque run est une barre horizontale
- Couleur des barres selon le statut : vert (termine), bleu (en cours), orange (en retard), gris (a venir)
- Au hover sur une barre : tooltip avec nom du run, client, echeance, progression
- Clic sur une barre : navigation vers `/runs/[id]`
- Filtre par responsable, client, type de run

#### Vue tableau (secondaire)

| Colonne         | Description                                    | Triable |
|-----------------|------------------------------------------------|---------|
| Nom             | Nom du run                                     | oui     |
| Client          | Nom du client                                  | oui     |
| Dossier         | Reference du dossier                           | oui     |
| Type            | Fiscal / Operationnel                          | oui     |
| Echeance        | Date limite                                    | oui     |
| Progression     | Barre de progression                           | oui     |
| Statut          | Badge                                          | oui     |
| Responsable     | Avatar + nom                                   | oui     |

#### Composants

| Composant          | Source        | Usage                                           |
|--------------------|---------------|--------------------------------------------------|
| `Tabs`             | shadcn/ui     | Toggle Gantt / Tableau                           |
| `Card`             | shadcn/ui     | Conteneur de la vue                              |
| `Table`            | shadcn/ui     | Vue tableau                                      |
| `Badge`            | shadcn/ui     | Statut des runs                                  |
| `Popover`          | shadcn/ui     | Filtres                                          |
| `Skeleton`         | shadcn/ui     | Loading state                                    |
| `Button`           | shadcn/ui     | Zoom Gantt, filtres, toggle vue                  |
| Custom `GanttChart`| composant shared | Rendu SVG/Canvas du diagramme de Gantt         |

> Note : le composant `GanttChart` est un composant custom dans `components/shared/gantt-chart.tsx`. Il utilise SVG natif pour le rendu, avec Framer Motion pour les animations de transition.

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | Gantt : `Skeleton` rectangulaire pleine largeur. Tableau : `Skeleton` lignes          |
| **Empty**    | "Aucun run en cours" + CTA "Voir les dossiers pour creer un run"                     |
| **Error**    | Banniere d'erreur + "Reessayer"                                                      |

#### Responsive

- **Desktop** : Gantt en pleine largeur, filtres en ligne
- **Tablette** : Gantt scrollable horizontalement, filtres dans un Popover
- **Mobile** : pas de vue Gantt (trop petit). La vue Tableau (cards empilees) devient la vue par defaut. Onglet Gantt masque.

---

### 9. /runs/[id]

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/runs/[id]`                                         |
| **Fichier**     | `app/(dashboard)/runs/[id]/page.tsx`                 |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (acces filtre par role)                         |

#### Description

Detail d'un run. Vue la plus complexe de l'application. Un run est compose d'une **timeline de taches** (fiscales et operationnelles) organisees en phases, separees par des **gates** (points de validation).

#### En-tete

- **Nom du run** (h1)
- **Client** (lien) + **Dossier** (lien)
- **Type** : fiscal / operationnel (badge)
- **Echeance** : date + indicateur de delai (badge couleur)
- **Responsable** : avatar + nom
- **Statut** : badge editable (Associe/Manager)
- **Progression** : barre + pourcentage

#### Corps principal : Timeline des taches

Structure type d'un run :

```
Phase 1 : Collecte
  [ ] Tache 1.1 — Recuperer les releves bancaires
  [ ] Tache 1.2 — Demander les factures manquantes
  [x] Tache 1.3 — Verifier les pieces justificatives
--- GATE : Validation collecte (Manager) ---
Phase 2 : Saisie
  [ ] Tache 2.1 — Saisie des ecritures
  [ ] Tache 2.2 — Lettrage des comptes
--- GATE : Validation saisie (Associe) ---
Phase 3 : Revision
  [ ] Tache 3.1 — Revision des comptes
  [ ] Tache 3.2 — Etablissement du bilan
```

- Chaque **tache** affiche : checkbox, nom, assignation, date prevue, statut, commentaire optionnel
- Chaque **gate** est un separateur visuel (ligne + icone cadenas). Les taches suivantes sont verrouillees tant que la gate n'est pas validee.
- La validation d'une gate se fait par un utilisateur ayant le role requis (defini dans le template de gate).

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Card`             | shadcn/ui    | Chaque phase                                     |
| `Badge`            | shadcn/ui    | Statut taches, gates, type de run                |
| `Avatar`           | shadcn/ui    | Assignation des taches                           |
| `Button`           | shadcn/ui    | Valider gate, ajouter tache, actions             |
| `Dialog`           | shadcn/ui    | Edition d'une tache, validation de gate          |
| `AlertDialog`      | shadcn/ui    | Confirmation de validation de gate               |
| `Separator`        | shadcn/ui    | Representation visuelle des gates                |
| `Popover`          | shadcn/ui    | Details d'une tache au hover                     |
| `Skeleton`         | shadcn/ui    | Loading state                                    |
| `Sheet`            | shadcn/ui    | Panel lateral de detail de tache (desktop)       |
| `Form`             | shadcn/ui    | Edition de tache dans Dialog/Sheet               |

#### Gates -- Detail

| Propriete           | Description                                                 |
|---------------------|-------------------------------------------------------------|
| Nom                 | Intitule de la gate (ex: "Validation collecte")             |
| Role requis         | Role minimum pour valider (Associe ou Manager)              |
| Statut              | Verrouille, en_attente, valide                              |
| Date de validation  | Remplie automatiquement a la validation                     |
| Valideur            | Nom de la personne ayant valide                             |
| Commentaire         | Optionnel, saisi lors de la validation                      |

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` pour l'en-tete + `Skeleton` blocs pour chaque phase                        |
| **Not found**| "Run introuvable" + CTA "Retour a la liste"                                          |
| **Locked**   | Taches apres une gate non validee : opacite reduite, checkbox disabled, icone cadenas |
| **Error**    | Banniere d'erreur + "Reessayer"                                                      |

#### Responsive

- **Desktop** : timeline en colonne principale + panel lateral (`Sheet`) pour le detail d'une tache selectionnee
- **Tablette** : timeline seule, detail de tache en `Dialog` fullscreen
- **Mobile** : timeline simplifiee (nom + checkbox + badge), detail en `Dialog` fullscreen

#### Interactions

- **Cocher une tache** : mise a jour optimistic, toast de confirmation
- **Clic sur une tache** : ouvre le `Sheet` (desktop) ou `Dialog` (mobile) avec les details editables
- **Valider une gate** : `AlertDialog` avec champ commentaire optionnel. Boutons "Annuler" / "Valider la gate". Si validation, les taches suivantes se deverrouillent avec animation (Framer Motion).
- **Ajouter une tache** : bouton "+" dans une phase, ouvre un `Dialog` de creation rapide
- **Reordonner les taches** : drag & drop au sein d'une phase (Associe/Manager uniquement)

---

### 10. /tickets

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/tickets`                                           |
| **Fichier**     | `app/(dashboard)/tickets/page.tsx`                   |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (donnees filtrees selon le role)                |

#### Description

Liste de tous les tickets (demandes, questions, problemes) lies aux clients et dossiers. Les tickets permettent de tracer les interactions et les demandes en cours.

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Table`            | shadcn/ui    | Tableau principal                                |
| `Input`            | shadcn/ui    | Recherche                                        |
| `Button`           | shadcn/ui    | "Nouveau ticket"                                 |
| `Badge`            | shadcn/ui    | Statut, priorite, type                           |
| `Popover`          | shadcn/ui    | Filtres avances                                  |
| `DropdownMenu`     | shadcn/ui    | Actions par ligne                                |
| `Avatar`           | shadcn/ui    | Assigne                                          |
| `Skeleton`         | shadcn/ui    | Loading state                                    |

#### Colonnes du tableau

| Colonne       | Description                                      | Triable |
|---------------|--------------------------------------------------|---------|
| Reference     | Code du ticket (TKT-001)                         | oui     |
| Objet         | Titre du ticket                                  | non     |
| Client        | Client concerne                                  | oui     |
| Type          | Type de ticket (configurable dans Settings)      | oui     |
| Priorite      | Badge : basse, normale, haute, urgente           | oui     |
| Statut        | Badge : ouvert, en_cours, en_attente, resolu     | oui     |
| Assigne       | Avatar du collaborateur                          | oui     |
| Cree le       | Date de creation                                 | oui     |
| Actions       | Dropdown : voir, assigner, fermer                | non     |

#### Filtres

- **Recherche textuelle** : sur reference, objet, client
- **Statut** : multi-select
- **Type** : multi-select
- **Priorite** : multi-select
- **Client** : combobox searchable
- **Assigne** : select

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` lignes (6 lignes)                                                          |
| **Empty**    | "Aucun ticket" + CTA "Creer un ticket"                                               |
| **No match** | "Aucun resultat" + CTA "Reinitialiser les filtres"                                   |
| **Error**    | Banniere d'erreur + "Reessayer"                                                      |

#### Responsive

- **Desktop** : tableau complet
- **Tablette** : colonnes Reference et Cree le masquees
- **Mobile** : vue cards empilees (objet, client, priorite badge, statut badge)

#### Interactions

- Clic sur une ligne : navigation vers `/tickets/[id]`
- "Nouveau ticket" : `Dialog` avec formulaire (objet, client, type, priorite, description). Accessible a tous les roles.

---

### 11. /tickets/[id]

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/tickets/[id]`                                      |
| **Fichier**     | `app/(dashboard)/tickets/[id]/page.tsx`              |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (acces filtre par role)                         |

#### Description

Detail d'un ticket. Affiche les informations du ticket en en-tete et un fil de discussion (commentaires) en dessous, a la maniere d'un thread de messagerie interne.

#### En-tete

- **Reference** + **Objet** (titre)
- **Client** (lien vers `/clients/[id]`)
- **Type** (badge) + **Priorite** (badge) + **Statut** (badge editable)
- **Assigne** : avatar + nom (editable via combobox)
- **Date de creation** + **Derniere mise a jour**
- **Dossier lie** (optionnel, lien vers `/dossiers/[id]`)

#### Fil de discussion

- Liste chronologique des commentaires
- Chaque commentaire affiche : avatar, nom, date/heure, contenu texte
- Zone de saisie en bas (textarea + bouton "Envoyer")
- Les commentaires sont en temps reel via Convex subscriptions

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Card`             | shadcn/ui    | En-tete du ticket                                |
| `Badge`            | shadcn/ui    | Type, priorite, statut                           |
| `Avatar`           | shadcn/ui    | Auteur des commentaires, assigne                 |
| `Button`           | shadcn/ui    | "Envoyer", "Resoudre", actions                   |
| `Input`            | shadcn/ui    | Zone de commentaire (textarea)                   |
| `Separator`        | shadcn/ui    | Entre les commentaires                           |
| `DropdownMenu`     | shadcn/ui    | Actions (editer statut, assigner, supprimer)     |
| `AlertDialog`      | shadcn/ui    | Confirmation de suppression                      |
| `Skeleton`         | shadcn/ui    | Loading state                                    |
| `Popover`+`Command`| shadcn/ui   | Combobox pour reassigner                          |

#### Etats

| Etat           | Comportement                                                                        |
|----------------|-------------------------------------------------------------------------------------|
| **Loading**    | `Skeleton` pour l'en-tete + `Skeleton` blocs pour les commentaires                  |
| **Not found**  | "Ticket introuvable" + CTA "Retour a la liste"                                     |
| **No comments**| "Aucun commentaire pour le moment. Ecrivez le premier !"                            |
| **Error**      | Banniere d'erreur + "Reessayer"                                                    |

#### Responsive

- **Desktop** : en-tete a gauche (1/3), fil de discussion a droite (2/3)
- **Tablette** : en-tete en haut, fil en dessous (empile)
- **Mobile** : tout empile, zone de saisie sticky en bas de l'ecran

#### Interactions

- **Ajouter un commentaire** : saisie + Enter ou clic "Envoyer". Apparition instantanee (optimistic update).
- **Changer le statut** : dropdown dans l'en-tete, mise a jour en temps reel.
- **Resoudre** : bouton "Marquer comme resolu" change le statut et desactive la zone de saisie. Reversible.
- **Reassigner** : combobox dans l'en-tete, notification envoyee au nouveau responsable.

---

### 12. /equipe

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/equipe`                                            |
| **Fichier**     | `app/(dashboard)/equipe/page.tsx`                    |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Associe (CRUD complet), Manager (lecture)            |

#### Description

Gestion de l'equipe du cabinet. Liste des collaborateurs avec leurs informations, roles et charge de travail. L'Associe peut ajouter, modifier et desactiver des membres. Le Manager peut uniquement consulter.

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Table`            | shadcn/ui    | Tableau des membres                              |
| `Avatar`           | shadcn/ui    | Photo/initiales du collaborateur                 |
| `Badge`            | shadcn/ui    | Role, statut (actif/inactif)                     |
| `Button`           | shadcn/ui    | "Ajouter un membre"                              |
| `Dialog`           | shadcn/ui    | Formulaire d'ajout/edition                       |
| `AlertDialog`      | shadcn/ui    | Confirmation de desactivation                    |
| `Form`             | shadcn/ui    | Formulaire membre                                |
| `DropdownMenu`     | shadcn/ui    | Actions par ligne                                |
| `Skeleton`         | shadcn/ui    | Loading state                                    |

#### Colonnes du tableau

| Colonne           | Description                                    |
|-------------------|------------------------------------------------|
| Membre            | Avatar + nom + prenom                          |
| Email             | Adresse email                                  |
| Role              | Badge (Associe, Manager, Collaborateur, Assistante) |
| Dossiers assignes | Nombre de dossiers en cours                    |
| Charge            | Indicateur visuel de charge (barre)            |
| Statut            | Actif / Inactif                                |
| Actions           | Modifier, Desactiver (Associe uniquement)      |

#### Dialog "Ajouter/Modifier un membre"

| Champ          | Type                          | Requis |
|----------------|-------------------------------|--------|
| Prenom         | `Input` text                  | oui    |
| Nom            | `Input` text                  | oui    |
| Email          | `Input` email                 | oui    |
| Role           | Select (4 roles)              | oui    |
| Mot de passe   | `Input` password (creation)   | oui*   |

> *Le mot de passe n'est requis qu'a la creation. A l'edition, le champ est optionnel (laisser vide = pas de changement).

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` lignes (4 lignes)                                                          |
| **Empty**    | "Aucun membre dans l'equipe" + CTA "Ajouter un membre" (Associe)                     |
| **Error**    | Banniere d'erreur + "Reessayer"                                                      |

#### Responsive

- **Desktop** : tableau complet
- **Tablette** : colonne Email masquee
- **Mobile** : vue cards (avatar + nom + role badge + charge barre)

#### Interactions

- **Ajouter un membre** : `Dialog` avec formulaire. A la soumission, un email d'invitation est envoye (V2).
- **Desactiver un membre** : `AlertDialog` "Ce membre ne pourra plus se connecter. Ses dossiers assignes devront etre reassignes." Boutons "Annuler" / "Desactiver".
- **Modifier un membre** : `Dialog` pre-rempli.

---

### 13. /documents

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/documents`                                         |
| **Fichier**     | `app/(dashboard)/documents/page.tsx`                 |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous (donnees filtrees selon le role)                |

#### Description

Bibliotheque documentaire centralisee. Tous les documents uploades ou generes (factures, bilans, declarations, courriers, etc.) sont accessibles ici, filtrables par client, categorie et date.

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Table`            | shadcn/ui    | Tableau des documents                            |
| `Input`            | shadcn/ui    | Recherche textuelle                              |
| `Button`           | shadcn/ui    | "Uploader un document"                           |
| `Badge`            | shadcn/ui    | Categorie du document                            |
| `Popover`          | shadcn/ui    | Filtres avances                                  |
| `Dialog`           | shadcn/ui    | Formulaire d'upload                              |
| `DropdownMenu`     | shadcn/ui    | Actions par ligne (telecharger, supprimer)       |
| `Skeleton`         | shadcn/ui    | Loading state                                    |

#### Colonnes du tableau

| Colonne       | Description                                      | Triable |
|---------------|--------------------------------------------------|---------|
| Nom           | Nom du fichier                                   | oui     |
| Client        | Client associe                                   | oui     |
| Categorie     | Badge (facture, bilan, declaration, courrier...) | oui     |
| Dossier       | Dossier associe (optionnel)                      | oui     |
| Uploade par   | Nom du collaborateur                             | oui     |
| Date          | Date d'upload                                    | oui     |
| Taille        | Taille du fichier                                | non     |
| Actions       | Telecharger, Supprimer                           | non     |

#### Filtres

- **Recherche textuelle** : sur le nom du fichier
- **Client** : combobox searchable
- **Categorie** : multi-select (categories configurables dans Settings)
- **Date** : date range picker

#### Dialog "Uploader un document"

| Champ          | Type                                       | Requis |
|----------------|--------------------------------------------|--------|
| Fichier        | Drag & drop ou file picker                 | oui    |
| Client         | Combobox searchable                        | oui    |
| Categorie      | Select (categories depuis Settings)        | oui    |
| Dossier        | Select (dossiers du client, optionnel)     | non    |
| Description    | Textarea                                   | non    |

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` lignes (6 lignes)                                                          |
| **Empty**    | "Aucun document" + CTA "Uploader un document"                                        |
| **Uploading**| Barre de progression dans le Dialog + desactivation du bouton "Envoyer"               |
| **No match** | "Aucun resultat" + CTA "Reinitialiser les filtres"                                   |
| **Error**    | Banniere d'erreur + "Reessayer". Erreur d'upload : toast rouge avec message           |

#### Responsive

- **Desktop** : tableau complet
- **Tablette** : colonnes Taille et Uploade par masquees
- **Mobile** : vue cards (nom fichier, client, categorie badge, date, bouton telecharger)

#### Interactions

- **Uploader** : `Dialog` avec zone drag & drop. Formats acceptes : PDF, JPG, PNG, XLSX, DOCX, CSV. Taille max : 10 Mo.
- **Telecharger** : ouverture dans un nouvel onglet ou telechargement direct selon le format
- **Supprimer** : `AlertDialog` "Ce document sera definitivement supprime." (Associe/Manager uniquement)
- **Preview** : clic sur le nom ouvre un apercu du document dans un `Dialog` fullscreen (PDF viewer integre pour les PDF)

---

### 14. /settings

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/settings`                                          |
| **Fichier**     | `app/(dashboard)/settings/page.tsx`                  |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Associe uniquement                                   |

#### Description

Page d'administration de l'application. Permet a l'Associe de configurer les parametres globaux : types de tickets, categories de documents, et templates de gates pour les runs.

#### Sections (onglets ou accordeons)

**1. Types de tickets**

- Liste editable des types de tickets (ex: "Demande d'information", "Probleme comptable", "Relance client")
- Chaque type : nom + couleur de badge
- Actions : ajouter, modifier, supprimer (avec verification qu'aucun ticket n'utilise ce type)

**2. Categories de documents**

- Liste editable des categories (ex: "Facture", "Bilan", "Declaration fiscale", "Courrier")
- Chaque categorie : nom + icone optionnelle
- Actions : ajouter, modifier, supprimer (avec verification)

**3. Templates de gates**

- Liste des modeles de gates reutilisables pour les runs
- Chaque template : nom, role requis pour validation, description
- Lors de la creation d'un run, le collaborateur peut choisir un template de gates

**4. Parametres generaux**

- Nom du cabinet
- Exercice comptable par defaut (date debut mois/jour)
- Fuseau horaire
- Logo personnalise (upload)

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Tabs`             | shadcn/ui    | Navigation entre sections                        |
| `Card`             | shadcn/ui    | Conteneur de chaque section                      |
| `Table`            | shadcn/ui    | Listes editables                                 |
| `Button`           | shadcn/ui    | Ajout, modification                              |
| `Dialog`           | shadcn/ui    | Formulaires d'ajout/edition                      |
| `AlertDialog`      | shadcn/ui    | Confirmation de suppression                      |
| `Form`             | shadcn/ui    | Formulaires                                      |
| `Input`            | shadcn/ui    | Champs texte                                     |
| `Badge`            | shadcn/ui    | Preview des types/categories                     |
| `Skeleton`         | shadcn/ui    | Loading state                                    |
| `Separator`        | shadcn/ui    | Entre sections                                   |

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` pour chaque section                                                        |
| **Error**    | Banniere d'erreur par section + "Reessayer"                                           |
| **Empty**    | Par section : "Aucun type/categorie/template" + CTA "Ajouter"                        |

#### Responsive

- **Desktop** : onglets horizontaux en haut
- **Mobile** : onglets scrollables horizontalement, tableaux simplifies en listes

#### Interactions

- **Ajouter** : `Dialog` avec formulaire minimal (nom + options)
- **Modifier** : `Dialog` pre-rempli
- **Supprimer** : `AlertDialog` avec verification. Si l'element est utilise, message "Ce type est utilise par X tickets. Veuillez d'abord reassigner ces tickets." et bouton de suppression desactive.

---

### 15. /settings/profile

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/settings/profile`                                  |
| **Fichier**     | `app/(dashboard)/settings/profile/page.tsx`          |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous                                                 |

#### Description

Page de profil utilisateur. Permet a chaque utilisateur de modifier ses informations personnelles et son mot de passe.

#### Sections

**1. Informations personnelles**

| Champ      | Type              | Editable |
|------------|-------------------|----------|
| Prenom     | `Input` text      | oui      |
| Nom        | `Input` text      | oui      |
| Email      | `Input` email     | lecture seule (grise) |
| Role       | `Badge`           | lecture seule |
| Avatar     | Upload image      | oui      |

**2. Changer le mot de passe**

| Champ                    | Type              | Requis |
|--------------------------|-------------------|--------|
| Mot de passe actuel      | `Input` password  | oui    |
| Nouveau mot de passe     | `Input` password  | oui    |
| Confirmer mot de passe   | `Input` password  | oui    |

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Card`             | shadcn/ui    | Conteneur de chaque section                      |
| `Form`             | shadcn/ui    | Formulaires                                      |
| `FormField`        | shadcn/ui    | Chaque champ                                     |
| `Input`            | shadcn/ui    | Champs texte et password                         |
| `Label`            | shadcn/ui    | Labels                                           |
| `Button`           | shadcn/ui    | "Enregistrer"                                    |
| `Avatar`           | shadcn/ui    | Apercu de l'avatar                               |
| `Badge`            | shadcn/ui    | Role (lecture seule)                              |
| `Separator`        | shadcn/ui    | Entre les sections                               |
| `Skeleton`         | shadcn/ui    | Loading state                                    |

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` pour les champs                                                            |
| **Default**  | Champs pre-remplis avec les donnees actuelles                                         |
| **Saving**   | Bouton desactive + spinner                                                            |
| **Success**  | Toast "Profil mis a jour"                                                             |
| **Error**    | Erreurs inline (FormMessage) + toast si erreur serveur                                |

#### Responsive

- **Desktop** : 2 sections cote a cote (infos a gauche, mot de passe a droite)
- **Mobile** : sections empilees

#### Interactions

- Chaque section a son propre bouton "Enregistrer" (soumissions independantes)
- Validation Zod : nouveau mot de passe minimum 8 caracteres, confirmation doit matcher
- L'upload d'avatar ouvre un file picker (formats : JPG, PNG, max 2 Mo)

---

### 16. /notifications

| Propriete       | Valeur                                               |
|-----------------|------------------------------------------------------|
| **URL**         | `/notifications`                                     |
| **Fichier**     | `app/(dashboard)/notifications/page.tsx`             |
| **Layout group**| `(dashboard)`                                        |
| **Auth**        | Requise                                              |
| **Roles**       | Tous                                                 |

#### Description

Centre de notifications. Affiche toutes les notifications de l'utilisateur connecte : assignations de dossiers, tickets, validations de gates, echeances proches, commentaires sur les tickets.

#### Types de notifications

| Type                    | Icone           | Description                                  |
|-------------------------|-----------------|----------------------------------------------|
| Assignation dossier     | FolderOpen      | "Vous avez ete assigne au dossier X"         |
| Assignation ticket      | MessageSquare   | "Un ticket vous a ete assigne"               |
| Commentaire ticket      | MessageCircle   | "Nouveau commentaire sur le ticket X"        |
| Gate en attente         | Lock            | "La gate X est en attente de validation"     |
| Gate validee            | Unlock          | "La gate X a ete validee par Y"              |
| Echeance proche         | AlertTriangle   | "L'echeance du run X est dans 3 jours"       |
| Nouveau membre          | UserPlus        | "Z a rejoint l'equipe"                       |

#### Composants

| Composant          | Source       | Usage                                            |
|--------------------|--------------|--------------------------------------------------|
| `Card`             | shadcn/ui    | Chaque notification                              |
| `Badge`            | shadcn/ui    | Type de notification                             |
| `Avatar`           | shadcn/ui    | Auteur de l'action                               |
| `Button`           | shadcn/ui    | "Tout marquer comme lu"                          |
| `Separator`        | shadcn/ui    | Entre groupes de notifications (aujourd'hui, hier, plus ancien) |
| `Skeleton`         | shadcn/ui    | Loading state                                    |

#### Structure

- Notifications groupees par jour : "Aujourd'hui", "Hier", "Cette semaine", "Plus ancien"
- Notifications non lues : fond legerement colore (`bg-muted/50`) + point bleu a gauche
- Clic sur une notification : marque comme lue + navigation vers la page concernee

#### Etats

| Etat         | Comportement                                                                          |
|--------------|---------------------------------------------------------------------------------------|
| **Loading**  | `Skeleton` blocs (5 notifications)                                                    |
| **Empty**    | "Aucune notification" + illustration. Sous-texte "Vous etes a jour !"                |
| **Error**    | Banniere d'erreur + "Reessayer"                                                      |

#### Responsive

- **Desktop** : liste centree, max-width 640px
- **Mobile** : pleine largeur, memes elements

#### Interactions

- **Marquer comme lu** : clic sur la notification ou bouton individuel
- **Tout marquer comme lu** : bouton en haut de la page, `AlertDialog` de confirmation
- **Temps reel** : les nouvelles notifications apparaissent en haut de la liste via Convex subscriptions
- **Badge dans la sidebar** : le nombre de notifications non lues est affiche a cote de l'icone dans le user card de la sidebar

---

## Composants partages

Composants reutilises sur plusieurs pages, places dans `components/shared/`.

| Composant                 | Fichier                                  | Description                                           |
|---------------------------|------------------------------------------|-------------------------------------------------------|
| `Sidebar`                 | `components/shared/sidebar.tsx`          | Sidebar collapsible avec navigation                   |
| `SidebarNavItem`          | `components/shared/sidebar-nav-item.tsx` | Element individuel de navigation sidebar              |
| `SidebarUserCard`         | `components/shared/sidebar-user-card.tsx`| Carte utilisateur en bas de la sidebar                |
| `Header`                  | `components/shared/header.tsx`           | Header avec breadcrumb, search, avatar                |
| `CommandPalette`          | `components/shared/command-palette.tsx`  | Recherche globale Cmd+K (cmdk)                        |
| `GanttChart`              | `components/shared/gantt-chart.tsx`      | Diagramme de Gantt SVG pour la vue runs               |
| `DataTable`               | `components/shared/data-table.tsx`       | Wrapper generique autour de shadcn Table (tri, filtre, pagination) |
| `EmptyState`              | `components/shared/empty-state.tsx`      | Illustration + message + CTA optionnel                |
| `ErrorBanner`             | `components/shared/error-banner.tsx`     | Banniere d'erreur avec bouton retry                   |
| `PageHeader`              | `components/shared/page-header.tsx`      | Titre de page h1 + description + actions              |
| `StatusBadge`             | `components/shared/status-badge.tsx`     | Badge de statut avec couleur automatique              |
| `PriorityBadge`           | `components/shared/priority-badge.tsx`   | Badge de priorite avec couleur automatique            |
| `ProgressBar`             | `components/shared/progress-bar.tsx`     | Barre de progression coloree                          |
| `DateRangePicker`         | `components/shared/date-range-picker.tsx`| Selecteur de plage de dates                           |
| `ComboboxSearch`          | `components/shared/combobox-search.tsx`  | Combobox searchable (Popover + Command)               |
| `FileUploadZone`          | `components/shared/file-upload-zone.tsx` | Zone de drag & drop pour upload de fichiers           |
| `RoleGuard`               | `components/shared/role-guard.tsx`       | Composant de protection par role (wrapper conditionnel)|
| `ConfirmDialog`           | `components/shared/confirm-dialog.tsx`   | AlertDialog generique de confirmation                 |

---

## Patterns recurrents

### Loading (Skeleton)

Chaque page suit le meme pattern :
1. Le layout (sidebar + header) est rendu immediatement
2. Le contenu de la page affiche des `Skeleton` correspondant a la structure finale
3. Les skeletons sont remplaces par les donnees reelles une fois le query Convex resolu
4. Pas de spinner global, chaque section charge independamment

### Empty State

Pattern uniforme via le composant `EmptyState` :
```tsx
<EmptyState
  icon={FolderOpen}
  title="Aucun dossier"
  description="Commencez par creer votre premier dossier."
  action={{ label: "Creer un dossier", onClick: () => ... }}
/>
```

### Error State

Pattern uniforme via le composant `ErrorBanner` :
```tsx
<ErrorBanner
  message="Impossible de charger les donnees."
  onRetry={() => refetch()}
/>
```

### Temps reel

Toutes les listes et les details utilisent les subscriptions Convex (`useQuery`) pour des mises a jour en temps reel. Cela concerne :
- Les tableaux de donnees (nouveau client, nouveau ticket, etc.)
- Le fil de discussion des tickets
- Les notifications
- La progression des runs et des taches
- Le statut des gates

### Optimistic Updates

Les actions rapides (cocher une tache, ajouter un commentaire, changer un statut) utilisent les `optimisticUpdate` de Convex pour un rendu instantane cote client, avec rollback automatique en cas d'echec serveur.

### Navigation & Breadcrumb

Le header affiche un breadcrumb dynamique base sur l'URL :
```
Dashboard > Clients > SARL Dupont > Dossiers > DOS-2025-001
```
Chaque segment est cliquable et mene a la page correspondante.

### Command Palette (Cmd+K)

Recherche globale accessible depuis n'importe quelle page via `Cmd+K` (macOS) ou `Ctrl+K` :
- Recherche dans : clients, dossiers, runs, tickets
- Resultats groupes par type
- Navigation directe vers la page de detail
- Composant base sur `cmdk` (deja installe)

### Responsive Breakpoints

| Breakpoint | Largeur     | Comportement sidebar       |
|------------|-------------|----------------------------|
| Mobile     | < 768px     | Sidebar masquee (Sheet)    |
| Tablette   | 768-1023px  | Sidebar collapsed (icones) |
| Desktop    | >= 1024px   | Sidebar ouverte            |

### Protection par role

Deux niveaux de protection :
1. **Serveur** : les queries Convex filtrent les donnees selon le role de l'utilisateur authentifie
2. **Client** : le composant `RoleGuard` masque les elements UI non autorises (boutons, onglets, etc.)

```tsx
<RoleGuard roles={["associe", "manager"]}>
  <Button>Ajouter un membre</Button>
</RoleGuard>
```

Les pages reservees (ex: `/settings`, `/equipe`) redirigent vers `/dashboard` si l'utilisateur n'a pas le role requis.
