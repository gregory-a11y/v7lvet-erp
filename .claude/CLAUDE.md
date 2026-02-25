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
- **Local**: localhost:3000 + `bunx convex dev`
- **VPS prod**: http://82.29.174.221:3001 (Docker, port 3001)

## Infrastructure
- **GitHub**: github.com/gregory-a11y/v7lvet-erp
- **VPS**: Hostinger — root@82.29.174.221, SSH key: ~/.ssh/id_ed25519_vps
- **Docker image**: ghcr.io/gregory-a11y/v7lvet-erp:latest
- **Convex**: tangible-curlew-143.eu-west-1.convex.cloud
- **Convex Dashboard**: dashboard.convex.dev

## Deployment — RÈGLE ABSOLUE

> **NE JAMAIS déployer manuellement.** Le pipeline CI/CD est GitHub Actions.

### Pipeline automatique (`.github/workflows/deploy.yml`)
- `git push origin dev` ou `git push origin main` → build Docker → push ghcr.io → deploy VPS
- Build time : ~3-5 min (avec cache Docker layers)
- Le VPS pull l'image `ghcr.io/gregory-a11y/v7lvet-erp:latest` et redémarre le container

### Secrets GitHub requis (Settings → Secrets → Actions)
| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | `82.29.174.221` |
| `VPS_SSH_KEY` | contenu de `~/.ssh/id_ed25519_vps` |
| `NEXT_PUBLIC_CONVEX_URL` | `https://tangible-curlew-143.eu-west-1.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://tangible-curlew-143.eu-west-1.convex.site` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `http://82.29.174.221:3001` |

### Convex (séparé du pipeline Docker)
- Dev local : `bunx convex dev` (auto-déploie les fonctions)
- Si changement de schema/fonctions en prod : `bunx convex deploy`

## Git Workflow
- Travail sur `dev`, commit format: `type: description`
- `git push origin dev` → déploiement automatique VPS
- PR dev → main si besoin de tagguer une version stable

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
