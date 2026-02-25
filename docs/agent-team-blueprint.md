# Agent Team Blueprint — V7LVET ERP

## Stratégie de Build

Le build suit une approche **séquentielle par phase** avec **parallélisation intra-phase** quand les modules sont indépendants. L'utilisation d'une équipe d'agents est recommandée pour les phases 4, 5 et 6 où les modules sont parallélisables.

---

## Structure de l'Équipe

### Option A — Build Séquentiel (recommandé pour MVP)
Un seul agent principal lit chaque meta-prompt et implémente module par module dans l'ordre du plan d'exécution. Plus simple, moins de risques de conflits.

**Quand utiliser** : si le build se fait en une seule session ou si l'on préfère la simplicité.

### Option B — Build Parallèle avec Équipe (phases 4-6)
Utiliser une équipe d'agents pour les phases parallélisables.

---

## Configuration Équipe (Option B)

### Rôles

| Agent | Type | Rôle | Worktree |
|-------|------|------|----------|
| **team-lead** | main session | Orchestration, review, merge | Non (branche dev) |
| **agent-backend** | general-purpose | Convex functions (queries, mutations, actions) | Oui (feat-backend) |
| **agent-frontend** | general-purpose | Pages, components, layouts | Oui (feat-frontend) |
| **agent-quality** | general-purpose | Review, tests, deploy check | Non |

### Assignation par Phase

#### Phase 1 — Fondation (séquentiel obligatoire)
| Tâche | Agent |
|-------|-------|
| Implémenter schema.ts complet | team-lead |
| Implémenter auth (login, middleware, user creation) | team-lead |
| Valider: `bunx convex dev --once` + `bun run build` | team-lead |

#### Phase 2 — Core Métier (séquentiel)
| Tâche | Agent |
|-------|-------|
| Backend clients + contacts (Convex functions) | team-lead |
| Frontend clients (pages, forms, table) | team-lead |
| Backend dossiers (Convex functions) | team-lead |
| Frontend dossiers (tab dans client detail) | team-lead |

#### Phase 3 — Moteur Fiscal (séquentiel, CRITIQUE)
| Tâche | Agent |
|-------|-------|
| Backend runs + moteur fiscal (21 conditions) | team-lead |
| Tests manuels du moteur fiscal (tous les cas) | team-lead |
| Frontend runs (vue Gantt) | team-lead |
| Backend tâches (CRUD + status flow) | team-lead |
| Frontend tâches (liste, détail, formulaires) | team-lead |

#### Phase 4 — Modules Secondaires (PARALLÉLISABLE)
| Tâche | Agent |
|-------|-------|
| Backend gates (Convex functions) | agent-backend |
| Frontend gates (components dans runs/taches) | agent-frontend |
| Backend tickets (Convex functions) | agent-backend |
| Frontend tickets (pages, forms) | agent-frontend |
| Backend documents (Convex File Storage) | agent-backend |
| Frontend documents (upload, liste) | agent-frontend |
| Review & merge des branches | team-lead |

#### Phase 5 — Dashboard & Équipe (PARALLÉLISABLE)
| Tâche | Agent |
|-------|-------|
| Backend dashboard (queries agrégées) | agent-backend |
| Frontend dashboard (KPIs, Gantt, charts) | agent-frontend |
| Backend équipe (user management) | agent-backend |
| Frontend équipe (liste, profils) | agent-frontend |
| Review & merge | team-lead |

#### Phase 6 — Notifications & Settings (PARALLÉLISABLE)
| Tâche | Agent |
|-------|-------|
| Backend notifications (cron + triggers) | agent-backend |
| Frontend notifications (bell, popover) | agent-frontend |
| Frontend settings (hub, config pages) | agent-frontend |
| Quality check final | agent-quality |

---

## Protocole de Communication

1. **team-lead** crée les tâches via TaskCreate avant chaque phase
2. **Agents** récupèrent leurs tâches via TaskList et les marquent in_progress
3. **Agents** lisent le meta-prompt correspondant avant de coder
4. **Agents** marquent les tâches completed et notifient le team-lead
5. **team-lead** review, merge les branches, et lance la phase suivante

---

## Convention de Branches (si worktrees)

```
dev                    ← branche principale de développement
feat/phase1-foundation ← schema + auth
feat/phase2-core       ← clients + dossiers
feat/phase3-fiscal     ← runs + tâches + moteur fiscal
feat/phase4-gates      ← gates (parallèle)
feat/phase4-tickets    ← tickets (parallèle)
feat/phase4-documents  ← documents (parallèle)
feat/phase5-dashboard  ← dashboard (parallèle)
feat/phase5-equipe     ← équipe (parallèle)
feat/phase6-notif      ← notifications (parallèle)
feat/phase6-settings   ← settings (parallèle)
```

---

## Checklist Pré-Build

- [ ] Schema draft validé (`docs/schema-draft.ts`)
- [ ] PRD lu et compris (`docs/prd.md`)
- [ ] Page tree validé (`docs/pages.md`)
- [ ] Tous les meta-prompts disponibles (`docs/prompts/*.md`)
- [ ] `bunx convex dev` fonctionne
- [ ] `bun run build` passe
- [ ] Branche dev à jour

---

## Lancement

```bash
# Depuis le projet
cd "/Users/gregorygiunta/PROJETS DEV/v7lvet-erp"

# Vérifier l'état
git status
bunx convex dev --once
bun run build

# Lancer le build
# Option A: /build (skill Claude Code)
# Option B: Créer l'équipe manuellement avec TaskCreate
```
