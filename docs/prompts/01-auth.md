# Meta-Prompt — Auth & Onboarding
> Priority: P0 | Depends on: 00-schema

## Context
Module d'authentification pour un outil interne. PAS d'inscription publique — seul l'admin (associé) peut créer des comptes. Email/password uniquement. 4 rôles avec permissions en cascade.

Référence : `docs/prd.md#auth`

## Stack
- Better Auth 1.4.9 (pinned) + @convex-dev/better-auth
- ConvexBetterAuthProvider (déjà configuré dans `app/providers.tsx`)
- shadcn/ui: Card, Input, Label, Button, Form
- react-hook-form + zod pour validation

## Auth déjà configuré
Les fichiers suivants existent déjà :
- `convex/convex.config.ts` — Better Auth component registered
- `convex/auth.config.ts` — Auth providers
- `convex/auth.ts` — Auth instance with Convex adapter
- `convex/http.ts` — HTTP router for auth routes
- `lib/auth-client.ts` — Client-side auth (signIn, signOut, useSession)
- `lib/auth-server.ts` — Server-side auth (getToken, isAuthenticated)
- `app/api/auth/[...all]/route.ts` — API route handler
- `app/providers.tsx` — ConvexBetterAuthProvider

## Ce qui reste à implémenter

### 1. Page Login `/app/(auth)/login/page.tsx`
- Formulaire email + password
- Pas de lien "s'inscrire" (admin-only)
- Pas de lien "mot de passe oublié" (MVP)
- Redirect vers `/dashboard` après login
- Toast d'erreur si credentials invalides
- Branding V7LVET : logo Émeraude, couleurs charte

### 2. Middleware de protection `middleware.ts`
- Routes protégées : tout sauf `/login` et `/api/auth/*`
- Si non authentifié → redirect `/login`
- Si authentifié sur `/login` → redirect `/dashboard`

### 3. Fonction admin pour créer des utilisateurs
- Mutation Convex `users.createByAdmin`
- Auth: seul un user avec role "associé" peut appeler
- Params: email, password, nom, prenom, role
- Crée le compte via Better Auth API

### 4. Composant UserMenu (header/sidebar)
- Avatar + nom
- Dropdown: Mon profil, Se déconnecter
- Utilise `useSession()` du client auth

## Rôles
```typescript
type UserRole = "associe" | "manager" | "collaborateur" | "assistante"
```

## Permissions helper
Créer `lib/permissions.ts` :
```typescript
const roleHierarchy = { associe: 4, manager: 3, collaborateur: 2, assistante: 1 }

function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

function canViewClient(user: User, client: Client): boolean {
  if (user.role === "associe") return true
  if (user.role === "manager") return client.managerId === user._id
  // collaborateur: check via dossier assignment
  return false
}
```

## User Stories

### US-1: Login
En tant qu'utilisateur avec un compte, je veux me connecter avec mon email et mot de passe.
- [ ] Le formulaire a 2 champs : email et mot de passe
- [ ] Bouton "Se connecter" submit le formulaire
- [ ] Après succès, redirect vers /dashboard
- [ ] Si erreur, toast rouge avec "Email ou mot de passe incorrect"
- [ ] Pas de lien d'inscription visible
- [ ] Logo V7LVET Émeraude affiché

### US-2: Créer un utilisateur (admin)
En tant qu'associé, je veux créer un compte pour un nouveau collaborateur.
- [ ] Accessible depuis Settings > Équipe > "Ajouter un membre"
- [ ] Formulaire : nom, prénom, email, mot de passe temporaire, rôle
- [ ] Seul l'associé voit ce bouton
- [ ] Après création, le nouveau user peut se connecter

### US-3: Se déconnecter
- [ ] Bouton dans le dropdown du UserMenu
- [ ] Redirect vers /login après déconnexion

## Edge Cases
- Login avec mauvais credentials → message d'erreur générique (pas "email inconnu" vs "mauvais mdp")
- Session expirée → redirect vers /login avec toast
- Accès direct à une page protégée sans auth → redirect /login

## Commit
```
feat: implement auth login + middleware + admin user creation
```
