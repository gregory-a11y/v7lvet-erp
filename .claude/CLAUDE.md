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
- `git push origin dev` → déploiement automatique sur **dev** uniquement
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
- User role field: "admin" | "member"
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
