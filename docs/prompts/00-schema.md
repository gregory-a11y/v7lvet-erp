# Meta-Prompt — Convex Schema
> Priority: P0 | Depends on: nothing (first module)

## Context
Ce module initialise le schéma de données complet dans Convex. C'est la fondation sur laquelle tous les autres modules reposent. Le schéma doit être déployé et fonctionnel avant de commencer tout autre module.

Référence : `docs/prd.md#data-model` et `docs/schema-draft.ts`

## Stack
- Convex: defineSchema, defineTable, v validators
- @convex-dev/better-auth: composant Better Auth (gère ses propres tables auth)
- Pas d'UI dans ce module

## Tâche
1. Lire `docs/schema-draft.ts` pour le schéma complet
2. Implémenter le schéma dans `convex/schema.ts`
3. Vérifier que `bunx convex dev --once` déploie sans erreur
4. Vérifier que les tables auth de Better Auth sont créées automatiquement

## Tables principales (résumé)
- `clients` — entreprises avec données fiscales complètes
- `contacts` — personnes liées à un client
- `dossiers` — missions par client
- `runs` — exercices fiscaux
- `taches` — tâches fiscales (auto) + opérationnelles
- `gates` — points de contrôle
- `tickets` — anomalies / hors périmètre
- `ticketTypes` — catégories configurables
- `documents` — fichiers uploadés
- `documentCategories` — catégories de documents
- `notifications` — in-app
- `gateTemplates` — templates de gates

## Indexes critiques
- `taches.by_run` — lister les tâches d'un run
- `taches.by_assigne` — lister les tâches d'un collaborateur
- `taches.by_echeance` — trier par date d'échéance
- `clients.by_manager` — filtrer par portefeuille manager
- `notifications.by_user_read` — notifications non lues d'un user

## Vérification
```bash
bunx convex dev --once
# Doit afficher: ✔ Convex functions ready!
# Pas d'erreur de schema
```

## Commit
```
feat: implement complete Convex schema
```
