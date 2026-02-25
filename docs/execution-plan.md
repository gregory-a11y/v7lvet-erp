# Plan d'Exécution — V7LVET ERP

## Vue d'ensemble

12 modules, 6 phases, build séquentiel avec parallélisation possible sur certains modules.

**Temps estimé** : non fourni (focus sur l'ordre et les dépendances)

---

## Phases

### Phase 1 — Fondation (P0)
> Schéma + Auth + Infrastructure. Tout le reste dépend de ça.

| # | Module | Meta-Prompt | Dépendances | Description |
|---|--------|-------------|-------------|-------------|
| 1 | Schema | `00-schema.md` | aucune | Implémenter le schéma Convex complet (13 tables, indexes) |
| 2 | Auth | `01-auth.md` | 00-schema | Login, middleware, admin user creation, UserMenu |

**Validation Phase 1** :
- [ ] `bunx convex dev --once` → pas d'erreur de schéma
- [ ] Login fonctionnel avec email/password
- [ ] Middleware redirige vers /login si non authentifié
- [ ] Rôles stockés et accessibles

**Commit** : `feat: implement schema + auth foundation`

---

### Phase 2 — Core Métier (P0)
> Les entités métier principales : clients, dossiers. Socle des données.

| # | Module | Meta-Prompt | Dépendances | Description |
|---|--------|-------------|-------------|-------------|
| 3 | Clients | `02-clients.md` | 01-auth | CRUD clients + contacts + permissions cascade |
| 4 | Dossiers | `02b-dossiers.md` | 02-clients | CRUD dossiers (missions) + assignation collab |

**Parallélisable** : Non — dossiers dépend de clients.

**Validation Phase 2** :
- [ ] Créer un client avec toutes les données fiscales
- [ ] Ajouter des contacts au client
- [ ] Créer un dossier pour le client
- [ ] Assigner un collaborateur au dossier
- [ ] Vérifier la cascade de permissions (collab ne voit que ses dossiers)

**Commit** : `feat: implement clients + dossiers modules`

---

### Phase 3 — Moteur Fiscal (P0) ⭐ CRITIQUE
> Le cœur de l'ERP : runs et génération automatique des tâches fiscales.

| # | Module | Meta-Prompt | Dépendances | Description |
|---|--------|-------------|-------------|-------------|
| 5 | Runs | `03-runs.md` | 02-clients, 02b-dossiers | Runs + moteur fiscal (21 conditions) + vue Gantt |
| 6 | Tâches | `04-taches.md` | 03-runs | Gestion des tâches (fiscales + opérationnelles) |

**Parallélisable** : Non — tâches dépend de runs.

**Validation Phase 3** :
- [ ] Créer un run pour un client IS avec toutes les données remplies
- [ ] Vérifier que TOUTES les tâches fiscales sont générées correctement
- [ ] Tester les calculs de dates (clôture 31/12 vs autre date)
- [ ] Tester les acomptes IS (4 patterns de clôture)
- [ ] Tester TVA mensuelle (12 tâches) et trimestrielle (4 tâches)
- [ ] Tester TVA RSI (annuelle + 2 acomptes)
- [ ] Tester CFE, CVAE, DAS2, TS selon conditions
- [ ] Vérifier la vue Gantt avec les marqueurs d'échéance
- [ ] Créer une tâche opérationnelle manuellement
- [ ] Changer le status d'une tâche (flow a_venir → en_cours → termine)

**Commit** : `feat: implement fiscal engine + runs + tasks modules`

---

### Phase 4 — Modules Secondaires (P1)
> Gates, tickets, documents. Peuvent être parallélisés.

| # | Module | Meta-Prompt | Dépendances | Description |
|---|--------|-------------|-------------|-------------|
| 7 | Gates | `05-gates.md` | 03-runs, 04-taches | Points de contrôle + templates |
| 8 | Tickets | `06-tickets.md` | 02-clients | Anomalies + types configurables |
| 9 | Documents | `07-documents.md` | 02-clients | GED + upload Convex File Storage |

**Parallélisable** : OUI — gates, tickets et documents sont indépendants entre eux.

**Validation Phase 4** :
- [ ] Créer des gates sur une tâche et un run
- [ ] Valider/refuser une gate
- [ ] Créer un ticket avec type configurable
- [ ] Résoudre un ticket
- [ ] Uploader un document lié à un client
- [ ] Télécharger un document
- [ ] Configurer des catégories de documents

**Commit** : `feat: implement gates + tickets + documents modules`

---

### Phase 5 — Dashboard & Équipe (P1)
> Les vues de pilotage et la gestion d'équipe.

| # | Module | Meta-Prompt | Dépendances | Description |
|---|--------|-------------|-------------|-------------|
| 10 | Dashboard | `08-dashboard.md` | 03-runs, 04-taches, 06-tickets | KPIs + Gantt + performance équipe |
| 11 | Équipe | `09-equipe.md` | 01-auth | Gestion des membres + portfolios |

**Parallélisable** : OUI — dashboard et équipe sont indépendants.

**Validation Phase 5** :
- [ ] Dashboard affiche les KPIs corrects
- [ ] Vue Gantt timeline fonctionnelle avec les runs
- [ ] Vue performance équipe avec graphiques recharts
- [ ] Liste des membres de l'équipe
- [ ] Créer un utilisateur (admin only)
- [ ] Voir le portefeuille d'un manager

**Commit** : `feat: implement dashboard + team management`

---

### Phase 6 — Notifications & Settings (P2)
> Fonctionnalités de support.

| # | Module | Meta-Prompt | Dépendances | Description |
|---|--------|-------------|-------------|-------------|
| 12 | Notifications | `10-notifications.md` | 04-taches, 06-tickets | In-app notifications + cron échéances |
| 13 | Settings | `11-settings.md` | 05-gates, 06-tickets, 07-documents | Hub admin (types, templates, catégories) |

**Parallélisable** : OUI — notifications et settings sont indépendants.

**Validation Phase 6** :
- [ ] Notification reçue quand tâche assignée
- [ ] Notification reçue quand ticket créé
- [ ] Cron job génère notifications pour échéances J-3 et dépassées
- [ ] Bell icon avec badge unread count
- [ ] Page settings avec gestion des types/templates/catégories

**Commit** : `feat: implement notifications + admin settings`

---

## Graphe de dépendances

```
Phase 1: [00-schema] → [01-auth]
              ↓
Phase 2: [02-clients] → [02b-dossiers]
              ↓              ↓
Phase 3: [03-runs] ————→ [04-taches]
           ↓    ↓              ↓
Phase 4: [05-gates]    [06-tickets]    [07-documents]
           ↓              ↓                ↓
Phase 5: [08-dashboard]    [09-equipe]
           ↓                    ↓
Phase 6: [10-notifications]    [11-settings]
```

---

## Outils et Skills par Phase

| Phase | Skills Claude Code | Subagents | MCPs |
|-------|-------------------|-----------|------|
| 1. Fondation | `/sc:implement` | `explore-docs` (Context7: Convex, Better Auth) | Context7 |
| 2. Core Métier | `/sc:implement`, `frontend-design` | `explore-docs` (Context7: shadcn) | Context7 |
| 3. Moteur Fiscal | `/sc:implement` | `explore-docs` (Convex mutations) | Context7 |
| 4. Secondaires | `/sc:implement`, `frontend-design` | Parallèle: 3 agents (gates, tickets, docs) | Context7, Exa |
| 5. Dashboard | `/sc:implement`, `frontend-design` | `explore-docs` (recharts), `websearch` (Gantt libs) | Context7, Exa |
| 6. Support | `/sc:implement` | `explore-docs` (Convex crons) | Context7 |
| Final | `/review`, `/test`, `/deploy-check` | Code review agent | - |

---

## Checklist de Qualité Finale

- [ ] Toutes les tables du schéma sont implémentées et testées
- [ ] Auth fonctionne (login, logout, middleware, permissions cascade)
- [ ] CRUD complet pour chaque entité (clients, dossiers, runs, tâches, gates, tickets, documents)
- [ ] Moteur fiscal génère les tâches correctement pour TOUS les cas (IR, IS, TVA, taxes)
- [ ] Vue Gantt fonctionnelle avec navigation temporelle
- [ ] Dashboard avec KPIs en temps réel
- [ ] Notifications in-app fonctionnelles
- [ ] Settings admin fonctionnel
- [ ] Responsive (desktop, tablet, mobile)
- [ ] `bun run build` passe sans erreur
- [ ] `bunx biome check .` passe sans erreur
- [ ] Pas de données sensibles commitées
