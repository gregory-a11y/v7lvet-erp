# V7LVET ERP

## Project Overview
- **Name**: v7lvet-erp
- **Description**: Centraliser la gestion clients, piloter l'équipe, gérer projets et workflows
- **Domain**: ERP / Dashboard / CRM interne
- **Business model**: Outil interne — accès admin uniquement, pas d'inscription publique

## Stack
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion
- **Backend**: Convex Cloud
- **Auth**: Better Auth 1.4.9 + @convex-dev/better-auth (email/password, admin-only)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Linting**: Biome (not ESLint)
- **Runtime**: Bun (never npm/yarn)

## Environments
- **Local**: localhost:3000 + `bunx convex dev` → Convex dev (`tangible-curlew-143`)
- **VPS dev**: http://82.29.174.221:3001 → Convex dev (`tangible-curlew-143`) — pour tester
- **VPS prod**: http://82.29.174.221:3000 → Convex prod (`aware-cow-509`) — utilisé par le client

## Infrastructure
- **GitHub**: github.com/gregory-a11y/v7lvet-erp
- **VPS**: Hostinger — root@82.29.174.221, SSH key: ~/.ssh/id_ed25519_vps
- **Docker image**: ghcr.io/gregory-a11y/v7lvet-erp:latest
- **Convex**: tangible-curlew-143.eu-west-1.convex.cloud
- **Convex Dashboard**: dashboard.convex.dev
- **Email**: Resend (API directe, from: `noreply@send.endosia.com`, domaine vérifié)

## Deployment — RÈGLES ABSOLUES

> **TOUTES les modifications vont d'abord sur `dev`. Jamais directement en prod.**
> **La production ne se met à jour QUE sur ordre explicite de Grégory.**
> **NE JAMAIS déployer manuellement. Le pipeline CI/CD est GitHub Actions.**

### Workflow normal (modifications → dev)
```
code → git push origin dev → déploiement auto sur erp-dev (port 3001)
```

### Mise en production (ordre explicite uniquement)
```
Grégory dit "mets en production" ou "merge en prod"
→ PR dev → main (ou git push origin main)
→ déploiement auto sur erp-prod (port 3000) + Convex prod
```

### Ce qui se passe par branche
| Push sur | Container VPS | Convex DB | URL |
|----------|--------------|-----------|-----|
| `dev` | `erp-dev` port 3001 | `tangible-curlew-143` (dev) | 82.29.174.221:3001 |
| `main` | `erp-prod` port 3000 | `aware-cow-509` (prod) | 82.29.174.221:3000 |

### Secrets GitHub configurés (Settings → Secrets → Actions)
| Secret | Usage |
|--------|-------|
| `VPS_HOST` | IP du serveur |
| `VPS_SSH_KEY` | Clé SSH root |
| `NEXT_PUBLIC_CONVEX_URL` | Convex dev URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex dev site URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | URL app dev |
| `NEXT_PUBLIC_CONVEX_URL_PROD` | Convex prod URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL_PROD` | Convex prod site URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL_PROD` | URL app prod |
| `CONVEX_DEPLOY_KEY` | ⚠️ À ajouter manuellement (voir dashboard Convex) |

### Convex deploy key (à faire une fois)
1. Aller sur https://dashboard.convex.dev → projet v7lvet → Production → Settings
2. Copier le "Deploy key"
3. `gh secret set CONVEX_DEPLOY_KEY --body "ta-clé"`

## Git Workflow
- Travail sur `dev`, commit format: `type: description`
- **NE JAMAIS `git push` sans ordre explicite de Grégory** — seul Grégory décide quand push
- `git push origin dev` → uniquement quand Grégory le demande
- Mise en prod sur ordre explicite : `git push origin main`

## Branding
- **Primary**: Émeraude `#2E6965`
- **Secondary**: Océan Profond `#063238`
- **Background**: Gris Perlé `#F4F5F3`
- **Accent**: Améthyste `#6242FB`
- **Font titres**: Cabin Bold, uppercase
- **Font body**: Inter
- **Tone**: Corporate & professionnel
- **Dark mode**: Non (light only)
- **Ref complète**: `docs/branding.md`

## Key Files
- `convex/schema.ts` — Database schema
- `convex/auth.ts` — Auth instance with Convex adapter
- `convex/auth.config.ts` — Auth providers config
- `convex/http.ts` — HTTP router for auth routes
- `convex/convex.config.ts` — Convex app config with Better Auth component
- `lib/auth-client.ts` — Client-side auth (signIn, signOut, useSession)
- `lib/auth-server.ts` — Server-side auth (getToken, isAuthenticated, etc.)
- `app/providers.tsx` — ConvexBetterAuthProvider wrapper
- `docs/branding.md` — Full branding reference
- `docs/prd.md` — Product Requirements Document (after /prd)
- `docs/prompts/` — Meta-prompts for each module (after /prd)
- `docs/execution-plan.md` — Build plan (after /prd)

## Commands
- `bun dev` — Start Next.js dev server
- `bunx convex dev` — Start Convex dev server (run in parallel with bun dev)
- `bunx tsc --noEmit` — Type check
- `bunx biome check .` — Lint & format check
- `bunx biome check --write .` — Auto-fix lint & format
- `bun run build` — Production build

## Auth Architecture
- No public registration — admin creates all accounts
- Email/password authentication only
- User roles: "admin" | "manager" | "collaborateur"
- Better Auth runs on Convex (not separate DB)
- Auth routes: `/api/auth/[...all]`
- ConvexBetterAuthProvider wraps entire app with auth + Convex context

## Conventions
- camelCase for variables/functions, PascalCase for components/types
- All Convex functions check auth via `ctx.auth.getUserIdentity()`
- All public Convex functions have validators
- Use indexes for queries on tables with 100+ documents
- Use `bun` everywhere (never npm/yarn)
- Biome for formatting (tabs, double quotes, no semicolons unless needed)
- Commit messages in English: `type: description`

## Variables d'environnement Convex — RÈGLE ABSOLUE

> **Toute variable d'environnement utilisée dans du code Convex (actions, mutations, queries) DOIT être settée dans les env vars Convex, PAS dans `.env.local`.**
> Le code Convex s'exécute sur les serveurs Convex, pas en local. `.env.local` ne sert qu'au frontend Next.js.

### Comment gérer les env vars Convex
```bash
# Lister les vars existantes
bunx convex env list

# Ajouter/modifier une variable
bunx convex env set NOM_VARIABLE "valeur"

# Supprimer
bunx convex env unset NOM_VARIABLE
```

### Quand une nouvelle env var est nécessaire
1. **La setter immédiatement** via `bunx convex env set` — ne PAS demander à l'utilisateur de le faire manuellement
2. Si la valeur est inconnue (ex: nouvelle clé API pas encore créée), le signaler au user
3. Documenter dans cette section les vars requises

### Variables actuelles
| Variable | Usage | Où |
|----------|-------|----|
| `BETTER_AUTH_SECRET` | Secret Better Auth | Convex |
| `RESEND_API_KEY` | Envoi d'emails transactionnels | Convex |
| `SITE_URL` | URL du site pour auth sign-up | Convex |
| `TRUSTED_ORIGINS` | CORS Better Auth | Convex |
| `NEXT_PUBLIC_CONVEX_URL` | URL Convex | `.env.local` (frontend) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | URL Better Auth | `.env.local` (frontend) |

## Rituel de vérification — OBLIGATOIRE après chaque implémentation

> **Après chaque série de modifications, exécuter systématiquement ce rituel SANS que l'utilisateur ait besoin de le demander.**

### Étape 1 — Sync Convex (si backend modifié)
```bash
bunx convex dev --once
```
Vérifie que le schéma et les fonctions se déploient sans erreur.

### Étape 2 — TypeScript
```bash
bunx tsc --noEmit
```
Objectif : 0 erreurs.

### Étape 3 — Lint
```bash
bunx biome check .
```
Objectif : 0 erreurs (warnings acceptables).

### Étape 4 — Vérification fonctionnelle
Analyser les features impactées et vérifier :
- Les imports existent et sont corrects
- Les types correspondent entre frontend et backend
- Les variables d'environnement nécessaires sont documentées
- Les flows utilisateur critiques (auth, email, permissions) sont cohérents de bout en bout
- Si un service externe est impliqué (Resend, API tierce), vérifier la config et le error handling

### Étape 5 — Rapport
Résumer au user : ce qui fonctionne, ce qui nécessite une action manuelle (ex: vérifier un domaine Resend, ajouter une env var).

### En cas d'erreur
- Corriger immédiatement
- Re-lancer le rituel depuis l'étape 1
- Boucle jusqu'à 0 erreurs

## Règle commit — TOUJOURS inclure convex/_generated/

> **À chaque commit git, vérifier si `convex/_generated/` a des modifications et les inclure.**

`convex/_generated/` est committé volontairement (nécessaire pour le CI/CD).
Si le schema ou les fonctions Convex ont changé, `bunx convex dev` régénère ces fichiers.
Ne pas les committer = le CI build avec des types obsolètes = erreur de déploiement.

```bash
# Toujours faire avant git commit :
git add convex/_generated/
# puis committer normalement
```

## Règle pre-push — JAMAIS de commit partiel — OBLIGATOIRE

> **Avant tout `git push`, exécuter l'agent `pre-push` ou appliquer manuellement ces règles.**
> **Le CI Docker build compile uniquement le code COMMITÉ, pas le working directory local.**
> **Un `tsc --noEmit` qui passe en local ne garantit PAS que le CI passera.**

### Le piège du commit partiel
Si tu modifies un type dans `convex/users.ts` et que tu commites ce fichier mais PAS `app/(dashboard)/equipe/page.tsx` qui l'importe → le CI **échouera** même si `tsc` passe en local (car localement il voit les deux fichiers).

### Règles absolues avant push
1. **Vérifier qu'il n'y a AUCUN fichier modifié non-commité** (`git status` propre) ou que les fichiers restants ne dépendent pas des fichiers commités
2. **Si un type/export/interface change** → TOUS les fichiers qui l'importent DOIVENT être dans le même commit
3. **Utiliser `bun run build`** (pas juste `tsc`) — c'est ce que le CI exécute
4. **En cas de doute** : commiter TOUT (`git add -A`) plutôt que risquer un commit partiel
5. **Agent disponible** : `.claude/agents/pre-push.md` — protocole complet de vérification
