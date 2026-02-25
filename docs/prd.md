# V7LVET ERP -- Product Requirements Document (PRD)

**Version** : 1.0
**Date** : 25 février 2026
**Auteur** : Grégory Giunta
**Statut** : Draft

---

## Table des matières

1. [Vision & Contexte](#1-vision--contexte)
2. [Problème](#2-problème)
3. [Objectifs](#3-objectifs)
4. [Utilisateurs & Rôles](#4-utilisateurs--rôles)
5. [Architecture technique](#5-architecture-technique)
6. [Modules fonctionnels](#6-modules-fonctionnels)
   - 6.1 [Clients](#61-clients)
   - 6.2 [Dossiers](#62-dossiers)
   - 6.3 [Runs](#63-runs)
   - 6.4 [Tâches](#64-tâches)
   - 6.5 [Gates](#65-gates)
   - 6.6 [Tickets](#66-tickets)
   - 6.7 [Documents](#67-documents)
   - 6.8 [Dashboard](#68-dashboard)
   - 6.9 [Équipe](#69-équipe)
   - 6.10 [Notifications](#610-notifications)
   - 6.11 [Settings](#611-settings)
7. [Moteur de génération fiscale](#7-moteur-de-génération-fiscale)
8. [UI/UX & Design System](#8-uiux--design-system)
9. [Authentification & Sécurité](#9-authentification--sécurité)
10. [Infrastructure & Déploiement](#10-infrastructure--déploiement)
11. [Paysage concurrentiel](#11-paysage-concurrentiel)
12. [Hors périmètre MVP](#12-hors-périmètre-mvp)
13. [Glossaire](#13-glossaire)

---

## 1. Vision & Contexte

**V7LVET** est un cabinet pluridisciplinaire en expertise comptable, audit et conseil financier. Le cabinet opère actuellement avec un système fragmenté (Airtable, Pennylane, Slack) qui ne permet ni centralisation, ni automatisation, ni traçabilité.

**V7LVET ERP** est un logiciel interne de gestion de cabinet (practice management) construit sur mesure pour remplacer cette stack fragmentée par une plateforme unique, temps réel, conforme à la réglementation fiscale française.

Le produit se positionne dans le segment "practice management for accounting firms", un marché dominé par des solutions anglophones (Karbon, Canopy, TaxDome) qui ne couvrent pas les spécificités fiscales françaises.

---

## 2. Problème

| Problème | Impact |
|----------|--------|
| Données fragmentées sur 3+ outils (Airtable, Pennylane, Slack) | Pas de source unique de vérité |
| Aucune automatisation ni alerte | Tâches oubliées, échéances manquées |
| Pas de visibilité temps réel sur l'avancement des dossiers | Le management pilote à l'aveugle |
| Échéances fiscales ratées (TVA, IS, IR, CFE...) | Risque de pénalités pour les clients |
| Pas de traçabilité (qui a fait quoi, quand) | Impossible de responsabiliser, auditer |
| Le système ne scale pas avec la croissance de l'équipe | Frein au développement du cabinet |

---

## 3. Objectifs

### Objectifs produit (MVP)

- **O1** : Centraliser 100% de la gestion client-dossier-tâche dans une seule plateforme
- **O2** : Automatiser la génération de toutes les tâches fiscales à partir des caractéristiques client
- **O3** : Garantir zéro échéance fiscale manquée grâce aux alertes et à la vue Gantt
- **O4** : Donner une visibilité temps réel à chaque niveau hiérarchique (associé, manager, collaborateur)
- **O5** : Assurer la traçabilité complète de chaque action (audit trail)

### Métriques de succès

| Métrique | Cible |
|----------|-------|
| Taux d'adoption interne | 100% de l'équipe sous 1 mois |
| Échéances fiscales manquées | 0 après mise en production |
| Temps de création d'un Run | < 10 secondes (auto-génération) |
| Temps pour trouver le statut d'un dossier | < 5 secondes |

---

## 4. Utilisateurs & Rôles

Le système implémente un modèle de permissions en cascade : chaque rôle hérite de la visibilité du rôle inférieur en y ajoutant celle de son périmètre.

### 4.1 Matrice des rôles

| Rôle | Périmètre de visibilité | Actions autorisées |
|------|--------------------------|---------------------|
| **Associé** (admin) | Tout le cabinet | Tout : créer des clients, gérer les utilisateurs, valider, piloter, configurer |
| **Manager** | Les dossiers de son équipe / portefeuille | Superviser, valider les gates, assigner les runs, voir les KPIs de son équipe |
| **Collaborateur** | Ses dossiers assignés uniquement | Exécuter les runs, remplir les gates, créer des tickets, uploader des documents |
| **Assistante** | TBD (périmètre limité) | Saisie de données, suivi administratif |

### 4.2 Organisation

L'organisation est structurée par **portefeuille client** :

- Chaque **Manager** a un portefeuille de clients et une équipe de collaborateurs
- Chaque **Collaborateur** est assigné à un ou plusieurs dossiers au sein du portefeuille de son manager
- L'**Associé** voit et agit sur l'ensemble des portefeuilles

### 4.3 Règles de cascade

```
Associé    →  voit TOUT (tous les portefeuilles, tous les dossiers)
  └─ Manager    →  voit les dossiers de SON portefeuille + ceux de son équipe
       └─ Collaborateur  →  voit SES dossiers assignés uniquement
            └─ Assistante  →  périmètre limité (TBD)
```

---

## 5. Architecture technique

### 5.1 Stack

| Couche | Technologie |
|--------|-------------|
| Runtime | **Bun** |
| Framework frontend | **Next.js 16** (App Router) |
| Langage | **TypeScript** (strict mode) |
| Styling | **Tailwind CSS v4** |
| Components | **shadcn/ui** |
| Backend / BDD / Real-time | **Convex Cloud** |
| Authentification | **Better Auth 1.4.9** + `@convex-dev/better-auth` |
| Linting | **Biome** |
| Déploiement | **VPS Hostinger** (Coolify TBD) |

### 5.2 Principes architecturaux

- **Real-time first** : Convex fournit la synchronisation temps réel native. Toute mutation est immédiatement visible par tous les utilisateurs connectés.
- **Server-side rendering** : Next.js App Router pour le SEO interne et les performances.
- **Type safety end-to-end** : Convex schema + TypeScript strict = zéro type `any`.
- **Pas d'intégration API externe pour le MVP** : Pennylane reste utilisé en complément (pas de connexion API).

### 5.3 Repository

- **GitHub** : `gregory-a11y/v7lvet-erp`
- **Branche principale** : `main`

---

## 6. Modules fonctionnels

Tous les modules listés ci-dessous sont **P0 (MVP)**. Aucun n'est optionnel.

---

### 6.1 Clients

#### Description

Module de gestion des entités entreprises clientes du cabinet. Chaque client représente une entreprise avec un ensemble ultra-complet d'informations nécessaires au moteur fiscal et à la gestion des dossiers.

#### Data Model

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `raisonSociale` | string | oui | Nom légal de l'entreprise |
| `siren` | string (9 chars) | oui | Numéro SIREN |
| `siret` | string (14 chars) | oui | Numéro SIRET (établissement principal) |
| `formeJuridique` | enum | oui | SARL, SAS, SA, EI, EIRL, SCI, SNC, EURL, SASU, Association, etc. |
| `adresse` | object | oui | Numéro, rue, code postal, ville, département |
| `departement` | string | oui | Code département (ex: "75", "13") |
| `categorieFiscale` | enum | oui | `IR`, `IS` |
| `sousCategorieFiscale` | enum | conditionnel | `BNC`, `BIC`, `RF` (si IR) |
| `regimeFiscal` | enum | oui | `Réel normal`, `Réel simplifié`, `Micro simplifié`, `Micro complet`, `Réel complet` |
| `regimeTVA` | enum | oui | `Franchise en base de TVA`, `Exonérée de TVA`, `Réel normal`, `Régime réel simplifié (RSI)` |
| `frequenceTVA` | enum | conditionnel | `mensuelle`, `trimestrielle`, `annuelle` (si Réel normal) |
| `jourTVA` | number | conditionnel | Nombre de jours après fin de période pour déclaration TVA |
| `dateClotureComptable` | string (JJ/MM) | oui | Jour et mois de clôture de l'exercice comptable |
| `caN1` | number | non | Chiffre d'affaires N-1 (en euros) |
| `montantCfeN1` | number | non | Montant CFE N-1 (en euros) |
| `montantCvaeN1` | number | non | Montant CVAE N-1 (en euros) |
| `montantTsN1` | number | non | Montant Taxe sur les Salaires N-1 (en euros) |
| `nombreEmployes` | number | non | Nombre de salariés |
| `secteur` | enum | non | `Commerce & Distribution`, `Services`, `Industrie`, etc. |
| `surfaceCommerciale` | number | non | Surface commerciale en m2 |
| `activite` | enum | non | `Profession libérale médicale conventionnée`, `Autres professions libérales`, `Activité commerciale, industrielle, artisanale`, etc. |
| `proprietaire` | boolean | non | L'entreprise est-elle propriétaire de locaux ? |
| `localPro` | boolean | non | L'entreprise a-t-elle un local professionnel ? |
| `paiementIsUnique` | boolean | non | Paiement IS en une seule fois (pas d'acomptes) |
| `managerId` | reference | oui | Manager responsable du portefeuille |
| `contacts` | relation (1:N) | oui | Contacts de l'entreprise |
| `notes` | text | non | Notes libres |
| `createdAt` | datetime | auto | Date de création |
| `updatedAt` | datetime | auto | Date de dernière modification |

#### Contacts (sous-entité)

| Champ | Type | Obligatoire |
|-------|------|-------------|
| `nom` | string | oui |
| `prenom` | string | oui |
| `email` | string | non |
| `telephone` | string | non |
| `role` | string | non |
| `principal` | boolean | non |

#### User Stories

**US-CLI-01 : Créer un client**
> En tant qu'Associé, je veux créer une fiche client complète avec toutes les informations fiscales, afin que le moteur fiscal puisse auto-générer les tâches correctement.

Critères d'acceptation :
- [ ] Formulaire avec tous les champs du data model
- [ ] Validation des champs obligatoires avant soumission
- [ ] Validation du format SIREN (9 chiffres) et SIRET (14 chiffres)
- [ ] Les champs conditionnels s'affichent/masquent dynamiquement (ex: `sousCategorieFiscale` visible seulement si `categorieFiscale` = IR)
- [ ] Le client est assigné à un manager (portefeuille)
- [ ] Confirmation de création avec redirection vers la fiche client

**US-CLI-02 : Consulter la liste des clients**
> En tant qu'utilisateur, je veux voir la liste de mes clients (selon mon rôle) avec des filtres basiques.

Critères d'acceptation :
- [ ] Vue tableau avec colonnes : raison sociale, SIREN, forme juridique, catégorie fiscale, manager, nombre de dossiers actifs
- [ ] Filtres : par manager, par forme juridique, par catégorie fiscale, par régime TVA
- [ ] Recherche textuelle sur raison sociale et SIREN
- [ ] Tri sur chaque colonne
- [ ] Cascade de visibilité : collaborateur voit ses clients assignés, manager voit son portefeuille, associé voit tout
- [ ] Export CSV/Excel

**US-CLI-03 : Modifier un client**
> En tant qu'Associé ou Manager, je veux modifier les informations d'un client existant.

Critères d'acceptation :
- [ ] Tous les champs sont éditables
- [ ] Les modifications sont historisées (audit trail)
- [ ] Un avertissement s'affiche si une modification impacte des runs existants (ex: changement de régime TVA)

**US-CLI-04 : Gérer les contacts d'un client**
> En tant qu'utilisateur autorisé, je veux ajouter, modifier et supprimer des contacts liés à un client.

Critères d'acceptation :
- [ ] CRUD complet sur les contacts
- [ ] Un contact peut être marqué comme "principal"
- [ ] Affichage des contacts dans la fiche client

---

### 6.2 Dossiers

#### Description

Un dossier représente une **mission** pour un client. Un client peut avoir plusieurs dossiers simultanés (ex: comptabilité annuelle + audit + mission de conseil). Chaque dossier contient des runs et des tâches.

#### Data Model

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `clientId` | reference | oui | Client lié |
| `nom` | string | oui | Nom du dossier |
| `type` | enum | oui | `Comptabilité annuelle`, `Paie`, `Audit`, `Conseil`, `Juridique`, `Fiscal`, `Autre` |
| `statut` | enum | oui | `Actif`, `En pause`, `Clôturé` |
| `managerId` | reference | oui | Manager responsable |
| `collaborateurIds` | reference[] | oui | Collaborateurs assignés |
| `description` | text | non | Description de la mission |
| `dateDebut` | date | oui | Date de début de la mission |
| `dateFin` | date | non | Date de fin prévue |
| `notes` | text | non | Notes libres |
| `createdAt` | datetime | auto | |
| `updatedAt` | datetime | auto | |

#### User Stories

**US-DOS-01 : Créer un dossier**
> En tant qu'Associé ou Manager, je veux créer un dossier pour un client afin de suivre une mission.

Critères d'acceptation :
- [ ] Sélection du client dans un dropdown avec recherche
- [ ] Choix du type de dossier
- [ ] Assignation d'un manager et d'un ou plusieurs collaborateurs
- [ ] Le dossier est créé avec le statut "Actif" par défaut
- [ ] Redirection vers la page du dossier après création

**US-DOS-02 : Consulter les dossiers**
> En tant qu'utilisateur, je veux voir les dossiers qui me concernent.

Critères d'acceptation :
- [ ] Vue tableau : nom du dossier, client, type, statut, manager, nombre de runs, progression
- [ ] Filtres : par client, par type, par statut, par manager
- [ ] Cascade de visibilité respectée
- [ ] Clic sur un dossier ouvre sa page détaillée avec ses runs et tâches

**US-DOS-03 : Modifier / Clôturer un dossier**
> En tant qu'Associé ou Manager, je veux modifier ou clôturer un dossier.

Critères d'acceptation :
- [ ] Tous les champs sont éditables
- [ ] Passage du statut à "Clôturé" nécessite une confirmation
- [ ] Un dossier clôturé reste visible mais ses runs ne peuvent plus être modifiés

---

### 6.3 Runs

#### Description

Un Run représente un **exercice fiscal** pour un client. C'est l'unité de travail principale du cabinet. Lors de la création d'un Run, le [moteur de génération fiscale](#7-moteur-de-génération-fiscale) crée automatiquement toutes les tâches fiscales réglementaires basées sur les caractéristiques du client.

La **vue Gantt** est la visualisation impérative pour les runs : elle montre les échéances par entreprise sur un axe temporel.

#### Data Model

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `clientId` | reference | oui | Client lié |
| `dossierId` | reference | oui | Dossier parent |
| `exercice` | number | oui | Année de l'exercice fiscal (ex: 2026) |
| `statut` | enum | oui | `En cours`, `Terminé`, `Annulé` |
| `progression` | number | calculé | % de tâches terminées |
| `assigneeId` | reference | non | Collaborateur principal |
| `dateCreation` | datetime | auto | |
| `notes` | text | non | |

#### User Stories

**US-RUN-01 : Créer un Run**
> En tant qu'Associé ou Manager, je veux créer un Run pour un client afin que toutes les tâches fiscales soient automatiquement générées.

Critères d'acceptation :
- [ ] Sélection du client et du dossier parent
- [ ] Saisie de l'année d'exercice
- [ ] A la validation, le moteur fiscal génère automatiquement toutes les tâches applicables (< 10 secondes)
- [ ] L'utilisateur voit immédiatement la liste des tâches générées avec leurs échéances
- [ ] Un récapitulatif du nombre de tâches créées est affiché
- [ ] Les tâches sont toutes créées avec le statut "À venir"

**US-RUN-02 : Vue Gantt des Runs**
> En tant qu'Associé ou Manager, je veux visualiser tous les Runs sur un diagramme de Gantt pour avoir une vue temporelle des échéances par entreprise.

Critères d'acceptation :
- [ ] Axe horizontal : timeline (mois/semaines)
- [ ] Axe vertical : une ligne par client/entreprise
- [ ] Chaque tâche est représentée par une barre positionnée à sa date d'échéance
- [ ] Code couleur par statut : à venir (gris), en cours (émeraude), en attente (ambre), terminé (vert), en retard (rouge)
- [ ] Filtre par manager, par collaborateur, par type de tâche
- [ ] Zoom temporel : mois, trimestre, année
- [ ] La ligne "aujourd'hui" est visible
- [ ] Cascade de visibilité respectée

**US-RUN-03 : Consulter un Run**
> En tant qu'utilisateur assigné, je veux consulter le détail d'un Run pour voir toutes ses tâches et leur état.

Critères d'acceptation :
- [ ] Page détaillée avec : infos client, exercice, progression globale
- [ ] Liste des tâches avec : nom, type (fiscal/opérationnel), échéance, statut, assigné
- [ ] Tri et filtres sur les tâches
- [ ] Indicateur visuel des tâches en retard

**US-RUN-04 : Ajouter une tâche opérationnelle à un Run**
> En tant que Collaborateur, je veux ajouter une tâche manuelle (opérationnelle) à un Run pour des actions non fiscales.

Critères d'acceptation :
- [ ] Formulaire : nom, description, échéance, assigné
- [ ] La tâche est créée avec le type "opérationnelle" et le statut "À venir"
- [ ] La tâche apparaît dans la liste des tâches du Run

---

### 6.4 Tâches

#### Description

Les tâches sont les unités de travail atomiques. Il existe deux types :
- **Tâches fiscales** : auto-générées par le moteur fiscal avec des échéances réglementaires. Non supprimables manuellement.
- **Tâches opérationnelles** : créées manuellement, liées à un run. Librement modifiables.

#### Data Model

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `runId` | reference | oui | Run parent |
| `nom` | string | oui | Nom de la tâche |
| `type` | enum | oui | `fiscal`, `operationnel` |
| `statut` | enum | oui | `a_venir`, `en_cours`, `en_attente`, `termine` |
| `dateEcheance` | date | oui | Date limite |
| `assigneeId` | reference | non | Collaborateur assigné |
| `description` | text | non | |
| `templateSource` | string | non | Nom du template fiscal source (si type = fiscal) |
| `gates` | relation (1:N) | non | Gates de contrôle |
| `isOverdue` | boolean | calculé | `dateEcheance` < aujourd'hui ET `statut` != "termine" |
| `completedAt` | datetime | non | Date de complétion |
| `completedBy` | reference | non | Utilisateur qui a complété |
| `createdAt` | datetime | auto | |

#### Workflow des statuts

```
À venir  →  En cours  →  Terminé
                ↓
          En attente (bloqué)  →  En cours  →  Terminé
```

- **À venir** : tâche créée, pas encore commencée
- **En cours** : tâche en cours de traitement
- **En attente** : tâche bloquée (manque d'information, en attente client, etc.)
- **Terminé** : tâche complétée

#### User Stories

**US-TSK-01 : Changer le statut d'une tâche**
> En tant que Collaborateur assigné, je veux faire avancer le statut d'une tâche pour refléter son avancement.

Critères d'acceptation :
- [ ] Seuls les transitions valides sont possibles (voir workflow ci-dessus)
- [ ] Le passage à "Terminé" enregistre `completedAt` et `completedBy` automatiquement
- [ ] Si une gate est définie sur la tâche, le passage à "Terminé" requiert la validation de la gate
- [ ] L'action est tracée dans l'audit trail

**US-TSK-02 : Voir les tâches en retard**
> En tant que Manager, je veux voir toutes les tâches en retard de mon équipe.

Critères d'acceptation :
- [ ] Filtre "en retard" dans la vue liste
- [ ] Indicateur visuel (couleur rouge, icône) sur les tâches en retard
- [ ] Tri par nombre de jours de retard
- [ ] Notification automatique quand une tâche passe en retard

**US-TSK-03 : Assigner / Réassigner une tâche**
> En tant que Manager, je veux assigner ou réassigner une tâche à un collaborateur.

Critères d'acceptation :
- [ ] Dropdown de sélection du collaborateur (filtré par équipe du manager)
- [ ] Notification envoyée au collaborateur assigné
- [ ] L'ancien assigné est notifié en cas de réassignation

---

### 6.5 Gates

#### Description

Les Gates sont des points de contrôle qualité à deux niveaux : au niveau **tâche** et au niveau **run**. Elles formalisent le processus de validation du cabinet : qui valide, quelle preuve est attendue, et que faire si la validation est bloquée.

#### Data Model

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `tacheId` | reference | conditionnel | Tâche liée (si gate au niveau tâche) |
| `runId` | reference | conditionnel | Run lié (si gate au niveau run) |
| `nom` | string | oui | Nom du point de contrôle |
| `responsableId` | reference | oui | Utilisateur responsable de la validation |
| `preuveAttendue` | string | oui | Description de la preuve attendue (lien Pennylane, document, message) |
| `preuveUrl` | string | non | URL ou référence du document de preuve fourni |
| `statut` | enum | oui | `en_attente`, `valide`, `refuse`, `escalade` |
| `typeValidation` | enum | oui | `revue` (manager), `validation_associe` (associé) |
| `regleEscalade` | string | non | Description de la règle d'escalade si bloqué |
| `escaladeApres` | number | non | Nombre de jours avant escalade automatique |
| `commentaire` | text | non | Commentaire de validation/refus |
| `validatedAt` | datetime | non | Date de validation |
| `validatedBy` | reference | non | Utilisateur qui a validé |
| `createdAt` | datetime | auto | |

#### User Stories

**US-GAT-01 : Valider une gate**
> En tant que Manager ou Associé, je veux valider une gate après vérification de la preuve fournie.

Critères d'acceptation :
- [ ] Seul le responsable désigné (ou un rôle supérieur) peut valider
- [ ] La preuve doit être renseignée avant validation
- [ ] Choix : "Valider" ou "Refuser" avec commentaire obligatoire en cas de refus
- [ ] La validation débloque la tâche associée (passage possible à "Terminé")
- [ ] Le refus remet la tâche en "En cours" avec notification au collaborateur

**US-GAT-02 : Escalade automatique**
> En tant qu'Associé, je veux que les gates bloquées soient automatiquement escaladées après un délai configurable.

Critères d'acceptation :
- [ ] Si une gate est en statut "en_attente" depuis plus de `escaladeApres` jours, elle passe en "escalade"
- [ ] L'Associé est notifié de l'escalade
- [ ] La gate escaladée est visible dans le dashboard avec un indicateur spécial

**US-GAT-03 : Configurer des templates de gates**
> En tant qu'Associé, je veux créer des templates de gates réutilisables pour standardiser les contrôles.

Critères d'acceptation :
- [ ] CRUD sur les templates de gates dans Settings
- [ ] Un template définit : nom, preuve attendue, type de validation, règle d'escalade
- [ ] Lors de la création d'un run, les gates templates sont automatiquement appliquées

---

### 6.6 Tickets

#### Description

Les tickets représentent des anomalies ou exceptions liées à un client. Ils ne sont pas nécessairement liés à un run spécifique. Les types de tickets sont configurables depuis l'application.

#### Types par défaut

| Type | Description |
|------|-------------|
| `manquant` | Pièce ou information manquante |
| `anomalie` | Incohérence ou erreur détectée |
| `arbitrage` | Décision à prendre (client ou associé) |
| `hors_perimetre` | Action hors mission contractuelle (suivi pour facturation complémentaire) |

#### Data Model

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `clientId` | reference | oui | Client lié |
| `runId` | reference | non | Run lié (optionnel) |
| `tacheId` | reference | non | Tâche liée (optionnel) |
| `titre` | string | oui | Titre du ticket |
| `description` | text | oui | Description détaillée |
| `type` | enum (configurable) | oui | Type de ticket |
| `priorite` | enum | oui | `basse`, `moyenne`, `haute`, `critique` |
| `statut` | enum | oui | `ouvert`, `en_cours`, `resolu`, `ferme` |
| `createurId` | reference | auto | Utilisateur qui a créé le ticket |
| `assigneeId` | reference | non | Utilisateur assigné à la résolution |
| `commentaires` | relation (1:N) | non | Fil de commentaires |
| `createdAt` | datetime | auto | |
| `resolvedAt` | datetime | non | |

#### User Stories

**US-TKT-01 : Créer un ticket**
> En tant que Collaborateur, je veux créer un ticket pour signaler une anomalie sur un client.

Critères d'acceptation :
- [ ] Sélection du client (obligatoire), du run et de la tâche (optionnels)
- [ ] Choix du type parmi les types configurés
- [ ] Choix de la priorité
- [ ] Notification au manager du client
- [ ] Le ticket apparaît dans la fiche client et dans le dashboard

**US-TKT-02 : Suivre et résoudre un ticket**
> En tant que Manager, je veux suivre les tickets de mon équipe et les résoudre.

Critères d'acceptation :
- [ ] Vue liste des tickets avec filtres : par client, par type, par priorité, par statut
- [ ] Fil de commentaires sur chaque ticket
- [ ] Changement de statut avec traçabilité
- [ ] Passage à "résolu" enregistre la date et l'utilisateur

**US-TKT-03 : Vue tickets "hors périmètre"**
> En tant qu'Associé, je veux filtrer les tickets "hors périmètre" pour préparer la facturation complémentaire.

Critères d'acceptation :
- [ ] Filtre dédié sur le type "hors_perimetre"
- [ ] Export CSV/Excel de ces tickets avec : client, description, date

---

### 6.7 Documents

#### Description

Module d'upload et de catégorisation de documents par client et/ou dossier. Les documents sont stockés via Convex File Storage.

#### Catégories par défaut

- Pièces comptables
- Déclarations fiscales
- Contrats
- Procès-verbaux
- Courriers
- Factures
- Bulletins de paie
- Autre

#### Data Model

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `clientId` | reference | oui | Client lié |
| `dossierId` | reference | non | Dossier lié (optionnel) |
| `nom` | string | oui | Nom du document |
| `categorie` | enum (configurable) | oui | Catégorie |
| `fichierUrl` | string | oui | URL du fichier stocké |
| `fichierTaille` | number | auto | Taille en octets |
| `fichierType` | string | auto | MIME type |
| `uploaderId` | reference | auto | Utilisateur qui a uploadé |
| `notes` | text | non | |
| `createdAt` | datetime | auto | |

#### User Stories

**US-DOC-01 : Uploader un document**
> En tant que Collaborateur, je veux uploader un document et le catégoriser pour le retrouver facilement.

Critères d'acceptation :
- [ ] Drag & drop ou sélection de fichier
- [ ] Sélection obligatoire du client et de la catégorie
- [ ] Sélection optionnelle du dossier
- [ ] Types acceptés : PDF, images (JPG/PNG), documents Office (DOCX, XLSX)
- [ ] Taille maximale : 10 Mo par fichier
- [ ] Le document est immédiatement visible dans la fiche client

**US-DOC-02 : Consulter les documents d'un client**
> En tant qu'utilisateur, je veux voir tous les documents d'un client, filtrés par catégorie.

Critères d'acceptation :
- [ ] Liste des documents avec : nom, catégorie, date d'upload, uploadé par
- [ ] Filtre par catégorie
- [ ] Prévisualisation des PDF et images
- [ ] Téléchargement direct

---

### 6.8 Dashboard

#### Description

Tableau de bord principal offrant une vision synthétique de l'activité du cabinet. Le contenu s'adapte au rôle de l'utilisateur (cascade de visibilité).

#### Composants

| Composant | Description | Associé | Manager | Collaborateur |
|-----------|-------------|---------|---------|---------------|
| **KPIs cards** | Indicateurs chiffrés clés | Tout le cabinet | Son portefeuille | Ses dossiers |
| **Timeline échéances** | Prochaines échéances sur axe temporel | Toutes | Son équipe | Les siennes |
| **Performance équipe** | Métriques de productivité | Toute l'équipe | Son équipe | -- |
| **Tâches en retard** | Liste des tâches dépassées | Toutes | Son équipe | Les siennes |
| **Tickets ouverts** | Nombre et liste des tickets actifs | Tous | Son équipe | Les siens |

#### KPIs

| KPI | Calcul |
|-----|--------|
| Tâches à venir (7 jours) | Count des tâches avec échéance dans les 7 prochains jours |
| Tâches en retard | Count des tâches avec échéance dépassée et statut != terminé |
| Tâches terminées (mois en cours) | Count des tâches terminées ce mois |
| Taux de complétion | % de tâches terminées / total tâches |
| Tickets ouverts | Count des tickets en statut ouvert ou en_cours |
| Runs actifs | Count des runs en statut "En cours" |

#### User Stories

**US-DSH-01 : Voir le dashboard adapté à mon rôle**
> En tant qu'utilisateur, je veux accéder à un dashboard qui me montre les informations pertinentes pour mon rôle.

Critères d'acceptation :
- [ ] Le dashboard est la page d'accueil après connexion
- [ ] Les KPIs sont calculés en temps réel (Convex reactivity)
- [ ] L'Associé voit les KPIs de tout le cabinet + la performance de chaque manager
- [ ] Le Manager voit les KPIs de son portefeuille + la performance de chaque collaborateur
- [ ] Le Collaborateur voit les KPIs de ses dossiers uniquement

**US-DSH-02 : Timeline des échéances**
> En tant qu'utilisateur, je veux voir une timeline des prochaines échéances.

Critères d'acceptation :
- [ ] Affichage chronologique des tâches à venir
- [ ] Code couleur selon l'urgence : > 7 jours (normal), 3-7 jours (orange), < 3 jours (rouge)
- [ ] Clic sur une échéance redirige vers la tâche

---

### 6.9 Équipe

#### Description

Module de gestion de l'équipe du cabinet : utilisateurs, rôles, affectation aux portefeuilles.

#### Data Model (User)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `email` | string | oui | Email unique |
| `nom` | string | oui | Nom de famille |
| `prenom` | string | oui | Prénom |
| `role` | enum | oui | `associe`, `manager`, `collaborateur`, `assistante` |
| `managerId` | reference | conditionnel | Manager de rattachement (si collaborateur ou assistante) |
| `avatar` | string | non | URL de l'avatar |
| `actif` | boolean | oui | Compte actif ou désactivé |
| `createdAt` | datetime | auto | |

#### User Stories

**US-EQP-01 : Créer un compte utilisateur**
> En tant qu'Associé, je veux créer un compte pour un nouveau membre de l'équipe.

Critères d'acceptation :
- [ ] Formulaire : email, nom, prénom, rôle, manager de rattachement (si applicable)
- [ ] Génération d'un mot de passe temporaire ou envoi d'un lien d'activation
- [ ] Pas d'inscription publique (admin-only)
- [ ] Le nouvel utilisateur apparaît dans la liste de l'équipe

**US-EQP-02 : Gérer les rôles et portefeuilles**
> En tant qu'Associé, je veux modifier le rôle d'un utilisateur ou réassigner son portefeuille.

Critères d'acceptation :
- [ ] Modification du rôle avec confirmation
- [ ] Réassignation du manager de rattachement
- [ ] Désactivation d'un compte (sans suppression des données)
- [ ] Impact visible sur la cascade de visibilité

**US-EQP-03 : Voir l'organigramme de l'équipe**
> En tant que Manager ou Associé, je veux voir l'organisation de l'équipe et les affectations.

Critères d'acceptation :
- [ ] Vue hiérarchique : Associé > Managers > Collaborateurs
- [ ] Pour chaque manager : liste de ses collaborateurs et ses clients
- [ ] Indicateurs de charge (nombre de dossiers / tâches actives par collaborateur)

---

### 6.10 Notifications

#### Description

Système de notifications in-app uniquement (pas d'email ni SMS pour le MVP). Les notifications sont déclenchées par des événements métier.

#### Triggers de notification

| Événement | Destinataire | Délai |
|-----------|-------------|-------|
| Échéance proche | Assigné de la tâche | Configurable : 7j, 3j, 1j avant |
| Échéance dépassée | Assigné + Manager | Immédiat |
| Ticket créé | Manager du client | Immédiat |
| Tâche assignée | Collaborateur assigné | Immédiat |
| Gate à valider | Responsable de la gate | Immédiat |
| Gate escaladée | Associé | Immédiat |
| Gate refusée | Collaborateur de la tâche | Immédiat |

#### Data Model

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `userId` | reference | oui | Destinataire |
| `type` | enum | oui | Type de notification (voir triggers) |
| `titre` | string | oui | Titre court |
| `message` | string | oui | Message détaillé |
| `lien` | string | non | URL interne vers l'objet concerné |
| `lu` | boolean | oui | Notification lue ou non |
| `createdAt` | datetime | auto | |

#### User Stories

**US-NTF-01 : Recevoir une notification**
> En tant qu'utilisateur, je veux être notifié en temps réel des événements qui me concernent.

Critères d'acceptation :
- [ ] Badge de notification dans la sidebar (nombre non-lu)
- [ ] Panel de notifications (dropdown ou page dédiée)
- [ ] Chaque notification affiche : titre, message, date, lien
- [ ] Clic sur une notification marque comme "lu" et redirige vers l'objet
- [ ] Action "Tout marquer comme lu"
- [ ] Les notifications sont temps réel (Convex subscriptions)

**US-NTF-02 : Configurer les rappels d'échéance**
> En tant qu'Associé, je veux configurer les délais de rappel d'échéance (7j, 3j, 1j).

Critères d'acceptation :
- [ ] Configuration dans Settings
- [ ] Les délais s'appliquent à toutes les tâches fiscales
- [ ] Possibilité d'activer/désactiver chaque pallier

---

### 6.11 Settings

#### Description

Module de configuration de l'application, accessible uniquement à l'Associé (admin).

#### Sections configurables

| Section | Éléments configurables |
|---------|----------------------|
| Types de tickets | CRUD sur les types (manquant, anomalie, arbitrage, hors périmètre, + custom) |
| Catégories de documents | CRUD sur les catégories |
| Templates de gates | CRUD sur les templates de gates |
| Rappels d'échéance | Palliers de notification (7j, 3j, 1j) |
| Informations cabinet | Nom, adresse, logo |

#### User Stories

**US-SET-01 : Gérer les types de tickets**
> En tant qu'Associé, je veux ajouter, modifier ou supprimer des types de tickets.

Critères d'acceptation :
- [ ] Liste des types avec possibilité d'ajout
- [ ] Les types par défaut ne peuvent pas être supprimés (seulement désactivés)
- [ ] Les types personnalisés sont utilisables immédiatement dans le formulaire de création de ticket

**US-SET-02 : Gérer les catégories de documents**
> En tant qu'Associé, je veux configurer les catégories disponibles pour classer les documents.

Critères d'acceptation :
- [ ] CRUD complet
- [ ] Les catégories par défaut ne peuvent pas être supprimées
- [ ] Modifications reflétées immédiatement dans les formulaires d'upload

---

## 7. Moteur de génération fiscale

Le moteur de génération fiscale est le **coeur** du système. Lorsqu'un Run est créé pour un client, le moteur analyse les caractéristiques fiscales du client et génère automatiquement toutes les tâches réglementaires avec leurs dates d'échéance calculées.

### 7.1 Variables d'entrée

| Variable | Source | Description |
|----------|--------|-------------|
| `categorieFiscale` | Client | `IR` ou `IS` |
| `sousCategorieFiscale` | Client | `BNC`, `BIC`, `RF` (si IR) |
| `regimeFiscal` | Client | `Réel normal`, `Réel simplifié`, `Micro simplifié`, `Micro complet`, `Réel complet` |
| `regimeTVA` | Client | `Franchise en base de TVA`, `Exonérée de TVA`, `Réel normal`, `Régime réel simplifié (RSI)` |
| `frequenceTVA` | Client | `mensuelle`, `trimestrielle` |
| `jourTVA` | Client | Nombre de jours après fin de période |
| `dateClotureComptable` | Client | Format JJ/MM |
| `exercice` | Run | Année N du run |
| `caN1` | Client | Chiffre d'affaires N-1 |
| `montantCfeN1` | Client | Montant CFE N-1 |
| `montantCvaeN1` | Client | Montant CVAE N-1 |
| `montantTsN1` | Client | Montant TS N-1 |
| `nombreEmployes` | Client | Nombre de salariés |
| `secteur` | Client | Secteur d'activité |
| `surfaceCommerciale` | Client | Surface en m2 |
| `activite` | Client | Type d'activité (profession libérale, etc.) |
| `proprietaire` | Client | Boolean |
| `localPro` | Client | Boolean |
| `departement` | Client | Code département |
| `paiementIsUnique` | Client | Boolean |

### 7.2 Variable auxiliaire

```
isCloture3112 = dateClotureComptable.jour === 31 && dateClotureComptable.mois === 12
dateCloture = Date(exercice, dateClotureComptable.mois - 1, dateClotureComptable.jour)
```

### 7.3 Fonctions utilitaires

```typescript
// Ajouter N mois (+ 15 jours si .5) à une date
function addMonths(date: Date, months: number): Date

// Date fixe : jour/mois/année
function fixedDate(day: number, month: number, year: number): Date

// Ajouter N jours à une date
function addDays(date: Date, days: number): Date
```

### 7.4 Règles de génération

#### 7.4.1 IR -- Impôt sur le Revenu

| Condition | Tâche générée | Échéance |
|-----------|---------------|----------|
| `categorieFiscale` = "IR" | Déclaration IR | Si clôture 31/12 : +4.5 mois. Sinon : 15/05/N+1 |
| `categorieFiscale` = "IR" ET `sousCategorieFiscale` = "BNC" ET `regimeFiscal` = "Réel" | Déclaration de résultat 2035 + annexes 2035 A et B | Si clôture 31/12 : +4.5 mois. Sinon : 15/05/N+1 |
| `categorieFiscale` = "IR" ET `sousCategorieFiscale` = "BIC" ET `regimeFiscal` = "Réel normal" | IR - Déclaration de résultat : liasse fiscale complète | Si clôture 31/12 : +4.5 mois. Sinon : 15/05/N+1 |
| `categorieFiscale` = "IR" ET `sousCategorieFiscale` = "BIC" ET `regimeFiscal` = "Réel simplifié" | IR - Déclaration de résultat : liasse fiscale simplifiée | Si clôture 31/12 : +4.5 mois. Sinon : 15/05/N+1 |
| `categorieFiscale` = "IR" ET `sousCategorieFiscale` = "RF" ET `regimeFiscal` IN ("Réel simplifié", "Micro simplifié") | Déclaration de résultat : liasse fiscale simplifiée (2072-S) | Si clôture 31/12 : +4.5 mois. Sinon : 15/05/N+1 |
| `categorieFiscale` = "IR" ET `sousCategorieFiscale` = "RF" ET `regimeFiscal` IN ("Réel complet", "Micro complet") | Déclaration de résultat : liasse fiscale complète (2072-C) | Si clôture 31/12 : +4.5 mois. Sinon : 15/05/N+1 |
| `activite` IN ("Profession libérale médicale conventionnée", "Autres professions libérales", "Activité commerciale, industrielle, artisanale") | Déclaration DSFU (+PAMC) | -- |

#### 7.4.2 IS -- Impôt sur les Sociétés

**Déclarations de résultat :**

| Condition | Tâche générée | Échéance |
|-----------|---------------|----------|
| `categorieFiscale` = "IS" ET `regimeFiscal` = "Réel simplifié" | IS - Déclaration de résultat : liasse fiscale simplifiée | Si clôture 31/12 : 15/05/N+1. Sinon : +3.5 mois |
| `categorieFiscale` = "IS" ET `regimeFiscal` = "Réel normal" | IS - Déclaration de résultat : liasse fiscale complète | Si clôture 31/12 : 15/05/N+1. Sinon : +3.5 mois |

**Obligations IS :**

| Condition | Tâche générée | Échéance |
|-----------|---------------|----------|
| `categorieFiscale` = "IS" | Déclaration solde IS - Cerfa 2572 | Si clôture 31/12 : 15/05/N+1. Sinon : +4.5 mois |
| `categorieFiscale` = "IS" | Approbation des comptes (AGO) | +6 mois après clôture |
| `categorieFiscale` = "IS" | Dépôt des comptes au greffe | AGO + 2 mois |
| `categorieFiscale` = "IS" | Établissement des comptes annuels | AGO + 2 mois |
| `categorieFiscale` = "IS" | Entretien de présentation des comptes annuels | AGO + 2 mois |
| `categorieFiscale` = "IS" | Déclaration revenus capitaux mobiliers - Cerfa 2777 | AGO + 15 jours |
| `categorieFiscale` = "IS" | Déclaration revenus de capitaux mobiliers - Cerfa IFU 2561 | 15/02/N+1 |

**IS - Solde et Acomptes :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| `categorieFiscale` = "IS" | IS - Solde | Si clôture 31/12 : +4.5 mois. Sinon : +3.5 mois |
| `categorieFiscale` = "IS" ET `paiementIsUnique` = false | IS - Acompte 1 à 4 | Voir table ci-dessous |

**Table des dates d'acomptes IS :**

| Période de clôture | Acompte 1 | Acompte 2 | Acompte 3 | Acompte 4 |
|--------------------|-----------|-----------|-----------|-----------|
| 20 février -- 19 mai N | 15/06/N-1 | 15/09/N-1 | 15/12/N-1 | 15/03/N |
| 20 mai -- 19 août N | 15/09/N-1 | 15/12/N-1 | 15/03/N | 15/06/N |
| 20 août -- 19 novembre N | 15/12/N-1 | 15/03/N | 15/06/N | 15/09/N |
| 20 novembre N -- 19 février N+1 (année civile) | 15/03/N | 15/06/N | 15/09/N | 15/12/N |

#### 7.4.3 TVA -- Taxe sur la Valeur Ajoutée

| Condition | Tâches générées | Échéances |
|-----------|-----------------|-----------|
| `regimeTVA` IN ("Exonérée de TVA", "Franchise en base de TVA") | **Aucune tâche TVA** | -- |
| `regimeTVA` = "Réel normal" ET `frequenceTVA` = "mensuelle" | 12 tâches : TVA réel normal - déclaration {mois} | Dernier jour du mois + `jourTVA` jours (pour chaque mois de janvier à décembre) |
| `regimeTVA` = "Réel normal" ET `frequenceTVA` = "trimestrielle" | 4 tâches : TVA réel normal - déclaration T1 à T4 | Fin de trimestre + `jourTVA` jours (31/03, 30/06, 30/09, 31/12) |
| `regimeTVA` = "Régime réel simplifié (RSI)" | TVA réel simplifié - déclaration annuelle | +3 mois après clôture |
| `regimeTVA` = "Régime réel simplifié (RSI)" | TVA réel simplifié - Acompte 1 | 31/07/N |
| `regimeTVA` = "Régime réel simplifié (RSI)" | TVA réel simplifié - Acompte 2 | 31/12/N |

#### 7.4.4 Taxes diverses

**CVAE (Cotisation sur la Valeur Ajoutée des Entreprises) :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| `caN1` > 152 500 | Déclaration de valeur ajoutée (1330) + CVAE | 15/05/N+1 |
| `caN1` > 500 000 | CVAE - Formulaire 1329 - AC - SD - Solde | 01/05/N+1 |
| `caN1` > 500 000 ET `montantCvaeN1` > 1 500 | CVAE - Formulaire 1329 - AC - SD - Acompte 1 | 15/06/N |
| `caN1` > 500 000 ET `montantCvaeN1` > 1 500 | CVAE - Formulaire 1329 - AC - SD - Acompte 2 | 15/09/N |

**CFE (Cotisation Foncière des Entreprises) :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| Toujours | CFE - Solde | 15/12/N |
| `montantCfeN1` >= 3 000 | CFE - Acompte | 15/06/N |
| Toujours | CFE - Modification déclaration (1447 - M) | 30/04/N+1 |

**DAS2 :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| Toujours | DAS2 - Formulaire 2460 - 2 - SD | Si IS et clôture 31/12 : 01/05/N+1. Si IS et autre clôture : +3 mois. Si IR : 01/05/N+1 |

**TS (Taxe sur les Salaires) :**

Condition préalable : `nombreEmployes` >= 1 ET `regimeTVA` IN ("Exonérée de TVA", "Franchise en base de TVA")

| Condition supplémentaire | Tâches | Échéances |
|--------------------------|--------|-----------|
| `montantTsN1` <= 4 000 | TS - Formulaire 2502 (annuelle) | 15/01/N+1 |
| `montantTsN1` > 4 000 ET < 10 000 | TS - Formulaire 2501 - SD - 1 | 15/04/N |
| | TS - Formulaire 2501 - SD - 2 | 15/07/N |
| | TS - Formulaire 2501 - SD - 3 | 15/10/N |
| | TS - Régularisation - 2502 - SD | 31/01/N+1 |
| `montantTsN1` > 10 000 | 11 tâches mensuelles : TS - Formulaire 3310 - A - SD - {Mois} (février à décembre) | Le 15 du mois suivant |
| | TS - Régularisation - 2502 - SD | 31/01/N+1 |

**Taxe foncière :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| `proprietaire` = true | Taxe foncière | 30/09/N |

**TASCOM :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| `secteur` = "Commerce & Distribution" ET `surfaceCommerciale` >= 400 | TASCOM - Formulaire 3350 - SD | 15/06/N |

**TVE (Taxe sur les Véhicules des Sociétés / Entreprises) :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| `regimeTVA` IN ("Franchise en base de TVA", "Exonérée de TVA", "Réel normal") | TVE - Formulaire 3310 - A - SD | 31/01/N+1 |
| `regimeTVA` = "Régime réel simplifié (RSI)" | TVE - Formulaire 3517 | Si clôture 31/12 : 01/05/N+1. Sinon : +3 mois |

**DECLOYER :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| `localPro` = true ET CFE-Solde créée | DECLOYER | Si clôture 31/12 : 15/05/N+1. Sinon : le 15 du 3e mois après clôture |

**TSB (Taxe sur les Bureaux) :**

| Condition | Tâche | Échéance |
|-----------|-------|----------|
| `departement` IN ("75", "77", "78", "91", "92", "93", "94", "95", "06", "13", "83") | Taxe sur les bureaux - formulaire 6705 - B | 01/03/N |

### 7.5 Implémentation technique

Le moteur fiscal est implémenté comme une **Convex mutation** qui :

1. Reçoit le `clientId` et l'`exercice` en paramètre
2. Récupère toutes les caractéristiques fiscales du client
3. Évalue séquentiellement toutes les conditions des sections 7.4.1 à 7.4.4
4. Calcule les dates d'échéance avec les fonctions utilitaires
5. Crée toutes les tâches en batch dans la base de données
6. Retourne le nombre de tâches créées et un récapitulatif

Le moteur doit etre :
- **Déterministe** : les mêmes inputs produisent toujours les mêmes outputs
- **Testable** : chaque règle est testable unitairement
- **Extensible** : ajout de nouvelles règles sans modifier le code existant (pattern condition/action)
- **Performant** : génération de toutes les tâches en < 10 secondes

---

## 8. UI/UX & Design System

### 8.1 Principes généraux

- **Langue** : Français uniquement (labels, messages, dates au format DD/MM/YYYY)
- **Theme** : Light only (pas de dark mode)
- **Style** : Corporate, professionnel, épuré
- **Responsive** : Desktop first (usage principal sur desktop au cabinet)

### 8.2 Palette de couleurs

| Nom | Hex | Tailwind utility | Usage |
|-----|-----|-------------------|-------|
| Gris Perlé | `#F4F5F3` | `bg-v7-perle` | Background, surfaces claires |
| Océan Profond | `#063238` | `bg-v7-ocean` | Texte principal, sidebar, foncé |
| Émeraude | `#2E6965` | `bg-v7-emeraude` | Primary, boutons, liens |
| Améthyste | `#6242FB` | `bg-v7-amethyste` | Accent, CTA, highlights |

**Couleurs dérivées :**

| Usage | Hex |
|-------|-----|
| Secondary background | `#E8EAE6` |
| Muted text | `#4A6B6A` |
| Sidebar accent | `#0A4A52` |
| Border | `#D4D6D2` |
| Destructive | `#DC2626` |

### 8.3 Typographies

| Usage | Font | Style |
|-------|------|-------|
| Titres (h1-h6) / Logo | **Cabin** | Bold, UPPERCASE |
| Corps de texte | **Inter** | Regular |
| Code / Mono | **Geist Mono** | Regular |

### 8.4 Layout

- **Sidebar collapsible** :
  - Mode étendu : icône + label du module
  - Mode réduit : icône seule
  - Expansion au hover
  - Couleur de fond : Océan Profond (`#063238`)
  - Items actifs : surlignage Émeraude

- **Zone principale** : fond Gris Perlé, contenu centré avec max-width

- **Border radius** : `0.5rem` (8px) sur tous les éléments (cards, boutons, inputs)

### 8.5 Composants clés

| Composant | Usage | Librairie |
|-----------|-------|-----------|
| DataTable | Toutes les vues liste | shadcn/ui Table + colonnes triables/filtrables |
| GanttChart | Vue Runs | Custom (ou librairie TBD) |
| KPICard | Dashboard | shadcn/ui Card |
| Sidebar | Navigation | Custom avec shadcn/ui |
| Form | Tous les formulaires | shadcn/ui Form + react-hook-form + zod |
| Dialog | Modales de confirmation | shadcn/ui Dialog |
| Toast | Feedback utilisateur | shadcn/ui Sonner |
| Badge | Statuts | shadcn/ui Badge |
| DropdownMenu | Actions contextuelles | shadcn/ui DropdownMenu |

### 8.6 Navigation (Sidebar)

```
Dashboard       (icône: LayoutDashboard)
Clients         (icône: Building2)
Dossiers        (icône: FolderOpen)
Runs            (icône: Play)
Tâches          (icône: CheckSquare)
Tickets         (icône: AlertTriangle)
Documents       (icône: FileText)
Équipe          (icône: Users)
Settings        (icône: Settings) [Associé uniquement]
```

### 8.7 Export

Toutes les vues liste (clients, dossiers, tâches, tickets) offrent un export CSV/Excel avec les colonnes visibles.

---

## 9. Authentification & Sécurité

### 9.1 Système d'authentification

| Aspect | Choix |
|--------|-------|
| Librairie | **Better Auth 1.4.9** + `@convex-dev/better-auth` |
| Méthode | Email / mot de passe uniquement |
| Inscription | Désactivée. Création de compte par l'Associé (admin) uniquement |
| Session | Session-based authentication |

### 9.2 Règles de sécurité

- **Pas d'inscription publique** : seul un Associé peut créer un compte
- **Mot de passe** : minimum 8 caractères, 1 majuscule, 1 chiffre
- **Session** : expiration configurable, invalidation à la déconnexion
- **Autorisation** : chaque query/mutation Convex vérifie le rôle de l'utilisateur ET la cascade de visibilité
- **Audit trail** : toute action de modification est enregistrée avec `userId`, `timestamp`, `action`, `entityId`
- **Validation des inputs** : toutes les mutations Convex valident les données avec des validators Convex (ou zod côté client)

### 9.3 Middleware d'autorisation

Chaque endpoint Convex (query/mutation) implémente une vérification en 2 étapes :

1. **Authentification** : l'utilisateur est-il connecté ? (session valide)
2. **Autorisation** : l'utilisateur a-t-il le droit d'accéder à cette ressource ?
   - Associé : accès total
   - Manager : accès aux ressources de son portefeuille et de son équipe
   - Collaborateur : accès à ses dossiers assignés uniquement
   - Assistante : périmètre restreint (TBD)

---

## 10. Infrastructure & Déploiement

### 10.1 Environnements

| Environnement | Usage | Infra |
|---------------|-------|-------|
| Development | Développement local | `bun dev` + Convex dev |
| Staging | Tests pré-production | TBD |
| Production | Usage réel | VPS Hostinger (Coolify TBD) |

### 10.2 Services

| Service | Provider |
|---------|----------|
| Application Next.js | VPS Hostinger (Coolify) |
| Backend / BDD / Real-time | Convex Cloud |
| File Storage | Convex File Storage |
| Repository | GitHub (`gregory-a11y/v7lvet-erp`) |
| Domain | TBD |

### 10.3 CI/CD

- Push sur `main` : deploy automatique (pipeline TBD)
- Linting : Biome en pre-commit
- Type-checking : `tsc --noEmit` en CI

---

## 11. Paysage concurrentiel

| Solution | Origine | Forces | Faiblesses vs V7LVET |
|----------|---------|--------|----------------------|
| **Karbon** | Australie/US | Leader mondial, AI, workflow puissant | $89/user/mois, pas de conformité fiscale française, en anglais |
| **Canopy** | US | Gestion documentaire forte | $90+/user/mois, pas de fiscal français, en anglais |
| **TaxDome** | US | Bon pour petits cabinets, portail client | $58/user/mois, fiscal US uniquement |
| **Queoval** | France | Français, formation comptable | Pas cloud-native, UX datée, pas de practice management moderne |
| **Pennylane** | France | Comptabilité intégrée, moderne | Pas un outil de practice management (gestion de cabinet), pas de suivi d'échéances |

### Positionnement V7LVET ERP

V7LVET ERP comble un vide sur le marché français :
- **Conformité fiscale française native** : moteur de génération automatique couvrant IR, IS, TVA, CVAE, CFE, DAS2, TS, etc.
- **Practice management moderne** : workflow, gates, tickets, Gantt
- **Cloud-native temps réel** : Convex pour la réactivité instantanée
- **Coût** : solution interne, pas de licence par utilisateur

---

## 12. Hors périmètre MVP

Les éléments suivants sont explicitement exclus du MVP :

| Élément | Raison |
|---------|--------|
| Intégration API Pennylane | Pennylane reste en complément, pas de connexion API pour la V1 |
| Notifications email / SMS | In-app uniquement pour le MVP |
| Portail client | Pas d'accès externe pour les clients |
| Dark mode | Light only |
| Multi-langue | Français uniquement |
| Application mobile | Desktop first |
| Facturation / Devis | Hors scope (géré ailleurs) |
| Gestion de la paie | Le module Dossier type "Paie" existe mais pas de traitement paie intégré |
| IA / Automatisations avancées | Post-MVP |

---

## 13. Glossaire

| Terme | Définition |
|-------|------------|
| **Run** | Exercice fiscal annuel d'un client. Contient l'ensemble des tâches fiscales et opérationnelles pour cet exercice. |
| **Gate** | Point de contrôle qualité avec validation formelle (preuve + responsable). |
| **Dossier** | Mission client (compta, audit, conseil...). Un client peut avoir plusieurs dossiers. |
| **Tâche fiscale** | Obligation déclarative générée automatiquement par le moteur fiscal. |
| **Tâche opérationnelle** | Action manuelle créée par un collaborateur dans le cadre d'un run. |
| **Portefeuille** | Ensemble de clients assignés à un manager. |
| **Cascade de visibilité** | Modèle de permissions où chaque niveau hiérarchique hérite de la visibilité des niveaux inférieurs. |
| **Clôture comptable** | Date de fin d'exercice comptable d'une entreprise (souvent 31/12 mais pas toujours). |
| **Liasse fiscale** | Ensemble des formulaires déclaratifs envoyés à l'administration fiscale. |
| **AGO** | Assemblée Générale Ordinaire. Réunion annuelle obligatoire des associés/actionnaires pour approuver les comptes. |
| **IS** | Impôt sur les Sociétés. |
| **IR** | Impôt sur le Revenu. |
| **TVA** | Taxe sur la Valeur Ajoutée. |
| **CFE** | Cotisation Foncière des Entreprises. |
| **CVAE** | Cotisation sur la Valeur Ajoutée des Entreprises. |
| **RSI** | Régime Réel Simplifié d'Imposition (TVA). |
| **DAS2** | Déclaration Annuelle des honoraires, commissions, etc. |
| **TS** | Taxe sur les Salaires. |
| **TASCOM** | Taxe sur les Surfaces Commerciales. |
| **TSB** | Taxe sur les Bureaux (Île-de-France et PACA). |
| **DECLOYER** | Déclaration des loyers des locaux professionnels. |
| **TVE** | Taxe sur les Véhicules des sociétés / Entreprises. |
| **IFU** | Imprimé Fiscal Unique (Cerfa 2561). |
| **BNC** | Bénéfices Non Commerciaux. |
| **BIC** | Bénéfices Industriels et Commerciaux. |
| **RF** | Revenus Fonciers. |
| **SIREN** | Système d'Identification du Répertoire des Entreprises (9 chiffres). |
| **SIRET** | Système d'Identification du Répertoire des Établissements (14 chiffres). |

---

*Document généré le 25 février 2026. Ce PRD est le document de référence pour le développement de V7LVET ERP. Toute modification doit être versionnée et approuvée.*
