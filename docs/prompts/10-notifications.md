# Meta-Prompt — Module Notifications
> Priority: P1 | Depends on: 00-schema, 01-auth

## Context
Systeme de notifications in-app pour un ERP de cabinet comptable. Pas d'email ni SMS pour le MVP. Les notifications alertent les utilisateurs sur 4 evenements metier critiques : echeance de tache proche (J-3), echeance depassee, ticket cree pour un de mes clients, tache assignee a moi.

Les notifications sont temps reel grace aux subscriptions Convex (reactives par defaut). Elles apparaissent dans une icone cloche dans le header du dashboard, avec un badge indiquant le nombre de non-lues. Un popover affiche la liste et permet de naviguer vers l'objet concerne.

Un cron job Convex tourne chaque jour a 8h00 pour detecter les echeances proches et depassees. Les notifications de type "ticket_cree" et "tache_assignee" sont declenchees en temps reel par les mutations des modules Tickets et Taches.

Reference : `docs/prd.md#610-notifications` et `docs/schema-draft.ts`

## Stack
- Convex: queries, mutations, scheduled functions (crons)
- shadcn/ui: Popover, Button, Badge, ScrollArea, Separator, Skeleton
- lucide-react: Bell, BellDot, Check, CheckCheck, ExternalLink
- Next.js 15 App Router (useRouter pour navigation)
- Pas de bibliotheque externe supplementaire

## Data Model
Table concernee : `notifications`

### notifications
```typescript
notifications: defineTable({
  userId: v.id("users"),
  type: v.union(
    v.literal("echeance_proche"),
    v.literal("echeance_depassee"),
    v.literal("ticket_cree"),
    v.literal("tache_assignee"),
  ),
  titre: v.string(),
  message: v.string(),
  lien: v.optional(v.string()), // URL interne vers la ressource concernee (ex: "/runs/abc123")
  isRead: v.boolean(), // default false a la creation
  relatedId: v.optional(v.string()), // ID de l'entite liee (tache, ticket, etc.)
  createdAt: v.number(), // Date.now()
})
  // Index compound : recuperer les notifications non-lues d'un utilisateur
  .index("by_user_read", ["userId", "isRead"])
  // Index pour le cron de nettoyage ou tri
  .index("by_user_created", ["userId", "createdAt"])
```

**Note** : Le schema-draft (`docs/schema-draft.ts`) definit deja la table `notifications` mais sans le champ `relatedId` ni l'index `by_user_created`. Il faudra mettre a jour le schema en consequence lors de l'implementation.

## Auth & Permissions
- **Voir ses notifications** : tout utilisateur authentifie (uniquement les siennes)
- **Marquer comme lue** : uniquement ses propres notifications
- **Creer une notification** : fonction interne uniquement (appelee par d'autres mutations ou le cron), jamais directement par un client
- **Supprimer** : pas de suppression dans le MVP (les notifications restent en base)

### Regles de filtrage par role
Aucun filtrage specifique par role sur les notifications elles-memes. Le filtrage se fait en amont : chaque notification est creee pour un `userId` precis. L'utilisateur ne voit que les notifications qui lui sont adressees.

| Role | Recoit quelles notifications |
|------|------------------------------|
| associe | Echeances de toutes les taches, tickets de tous les clients, taches assignees a lui |
| manager | Echeances des taches de ses clients, tickets de ses clients, taches assignees a lui |
| collaborateur | Echeances des taches qui lui sont assignees, taches assignees a lui |
| assistante | Taches assignees a elle uniquement |

## Pages
Pas de page dediee aux notifications. Le systeme est entierement contenu dans le header du dashboard :

### Integration dans le layout `(dashboard)/layout.tsx`
- Ajouter le composant `<NotificationBell />` dans le header, a cote du `<UserMenu />`
- Position : avant le UserMenu, aligne a droite

## Convex Functions

### Queries
- `notifications.listMine` -- Mes notifications recentes
  - Auth: utilisateur connecte (`ctx.auth.getUserIdentity()`)
  - Filtre: `userId === currentUser._id`
  - Params: `{ limit?: number }` (default 20)
  - Returns: `Notification[]` triees par `createdAt` DESC
  - Utilise l'index `by_user_created` pour le tri
  - Inclut les lues ET non-lues (les plus recentes)

- `notifications.unreadCount` -- Nombre de notifications non-lues
  - Auth: utilisateur connecte
  - Filtre: `userId === currentUser._id AND isRead === false`
  - Returns: `number` (utilise pour le badge)
  - Utilise l'index `by_user_read` pour filtrer efficacement
  - **Important** : cette query est souscrite en permanence (Convex reactive) pour mettre a jour le badge en temps reel

### Mutations
- `notifications.markAsRead` -- Marquer une notification comme lue
  - Auth: utilisateur connecte, doit etre le proprietaire de la notification
  - Params: `{ id: v.id("notifications") }`
  - Logique: verifie `notification.userId === currentUser._id`, puis `patch({ isRead: true })`
  - Returns: `void`

- `notifications.markAllAsRead` -- Marquer toutes mes notifications comme lues
  - Auth: utilisateur connecte
  - Logique: requete toutes les notifications avec `userId === currentUser._id AND isRead === false`, puis batch `patch({ isRead: true })` sur chacune
  - Returns: `void`

- `notifications.create` -- Creer une notification (INTERNE)
  - **Ne doit PAS etre appelee directement par le client.** Utilisee uniquement par d'autres mutations Convex ou le cron.
  - Params:
    ```typescript
    {
      userId: v.id("users"),
      type: v.union(
        v.literal("echeance_proche"),
        v.literal("echeance_depassee"),
        v.literal("ticket_cree"),
        v.literal("tache_assignee"),
      ),
      titre: v.string(),
      message: v.string(),
      lien: v.optional(v.string()),
      relatedId: v.optional(v.string()),
    }
    ```
  - Sets: `isRead: false`, `createdAt: Date.now()`
  - Returns: `notificationId`
  - **Anti-doublon** : avant de creer, verifier qu'il n'existe pas deja une notification avec le meme `userId`, `type` et `relatedId` creee dans les 24 dernieres heures. Si oui, ne pas creer de doublon.

### Scheduled Functions (Convex Crons)

#### `notifications.checkDeadlines` -- Cron quotidien
- **Frequence** : tous les jours a 08:00 UTC (configurer dans `convex/crons.ts`)
- **Logique** :
  1. Recuperer toutes les taches avec `status !== "termine"`
  2. Pour chaque tache avec une `dateEcheance` :

  **Echeance proche (J-3)** :
  ```typescript
  const today = new Date()
  const jMoins3 = new Date(today)
  jMoins3.setDate(jMoins3.getDate() + 3)
  const dateJ3 = jMoins3.toISOString().split('T')[0]

  if (tache.dateEcheance === dateJ3 && tache.assigneId) {
    // Creer notification "echeance_proche" pour l'assigne
    await ctx.runMutation(internal.notifications.create, {
      userId: tache.assigneId,
      type: "echeance_proche",
      titre: `Echeance dans 3 jours : ${tache.nom}`,
      message: `La tache "${tache.nom}" arrive a echeance le ${formatDate(tache.dateEcheance)}.`,
      lien: `/runs/${tache.runId}`,
      relatedId: tache._id,
    })
  }
  ```

  **Echeance depassee** :
  ```typescript
  const todayStr = today.toISOString().split('T')[0]

  if (tache.dateEcheance < todayStr && tache.status !== "termine" && tache.assigneId) {
    // Creer notification "echeance_depassee" pour l'assigne
    await ctx.runMutation(internal.notifications.create, {
      userId: tache.assigneId,
      type: "echeance_depassee",
      titre: `Echeance depassee : ${tache.nom}`,
      message: `La tache "${tache.nom}" devait etre terminee le ${formatDate(tache.dateEcheance)}.`,
      lien: `/runs/${tache.runId}`,
      relatedId: tache._id,
    })

    // Si la tache a un manager (via le client), notifier aussi le manager
    const run = await ctx.db.get(tache.runId)
    const client = await ctx.db.get(run.clientId)
    if (client.managerId && client.managerId !== tache.assigneId) {
      await ctx.runMutation(internal.notifications.create, {
        userId: client.managerId,
        type: "echeance_depassee",
        titre: `Echeance depassee : ${tache.nom}`,
        message: `La tache "${tache.nom}" (${client.raisonSociale}) est en retard.`,
        lien: `/runs/${tache.runId}`,
        relatedId: tache._id,
      })
    }
  }
  ```

- **Configuration cron** dans `convex/crons.ts` :
  ```typescript
  import { cronJobs } from "convex/server"
  import { internal } from "./_generated/api"

  const crons = cronJobs()

  crons.daily(
    "check-deadlines",
    { hourUTC: 8, minuteUTC: 0 },
    internal.notifications.checkDeadlines,
  )

  export default crons
  ```

## Notification Triggers — Detail complet

### 1. `echeance_proche` — Echeance dans 3 jours
- **Declencheur** : cron job `checkDeadlines`, tous les jours a 08:00 UTC
- **Condition** : `tache.dateEcheance === today + 3 jours` ET `tache.status !== "termine"` ET `tache.assigneId` existe
- **Destinataire** : le collaborateur assigne a la tache (`tache.assigneId`)
- **Titre** : `Echeance dans 3 jours : {nom de la tache}`
- **Message** : `La tache "{nom}" arrive a echeance le {date formatee}.`
- **Lien** : `/runs/{runId}`
- **Anti-doublon** : verifier `relatedId + type + userId` dans les 24h

### 2. `echeance_depassee` — Echeance depassee
- **Declencheur** : cron job `checkDeadlines`, tous les jours a 08:00 UTC
- **Condition** : `tache.dateEcheance < today` ET `tache.status !== "termine"`
- **Destinataires** :
  - Le collaborateur assigne (`tache.assigneId`)
  - Le manager du client (`client.managerId`) si different de l'assigne
- **Titre** : `Echeance depassee : {nom de la tache}`
- **Message (assigne)** : `La tache "{nom}" devait etre terminee le {date}.`
- **Message (manager)** : `La tache "{nom}" ({raison sociale du client}) est en retard.`
- **Lien** : `/runs/{runId}`
- **Anti-doublon** : une seule notification par tache en retard par jour (verifier `relatedId + type + userId` dans les 24h)

### 3. `ticket_cree` — Ticket cree pour un de mes clients
- **Declencheur** : mutation `tickets.create` (module Tickets)
- **Condition** : le client du ticket a un `managerId`
- **Destinataire** : le manager du client (`client.managerId`)
- **Titre** : `Nouveau ticket : {titre du ticket}`
- **Message** : `Un ticket a ete cree pour {raison sociale} : "{titre du ticket}".`
- **Lien** : `/tickets/{ticketId}`
- **Implementation** : a la fin de `tickets.create`, ajouter :
  ```typescript
  // Dans convex/tickets.ts > create mutation
  const client = await ctx.db.get(args.clientId)
  if (client.managerId) {
    await ctx.runMutation(internal.notifications.create, {
      userId: client.managerId,
      type: "ticket_cree",
      titre: `Nouveau ticket : ${args.titre}`,
      message: `Un ticket a ete cree pour ${client.raisonSociale} : "${args.titre}".`,
      lien: `/tickets/${ticketId}`,
      relatedId: ticketId,
    })
  }
  ```

### 4. `tache_assignee` — Tache assignee a moi
- **Declencheur** : mutation `taches.update` (module Taches) quand `assigneId` change
- **Condition** : `args.assigneId` est defini ET different de l'ancien `assigneId`
- **Destinataire** : le nouvel assigne (`args.assigneId`)
- **Titre** : `Tache assignee : {nom de la tache}`
- **Message** : `La tache "{nom}" vous a ete assignee.`
- **Lien** : `/runs/{runId}`
- **Implementation** : dans `taches.update`, detecter le changement d'assignation :
  ```typescript
  // Dans convex/taches.ts > update mutation
  const existingTache = await ctx.db.get(args.id)

  if (args.assigneId && args.assigneId !== existingTache.assigneId) {
    await ctx.runMutation(internal.notifications.create, {
      userId: args.assigneId,
      type: "tache_assignee",
      titre: `Tache assignee : ${existingTache.nom}`,
      message: `La tache "${existingTache.nom}" vous a ete assignee.`,
      lien: `/runs/${existingTache.runId}`,
      relatedId: existingTache._id,
    })
  }
  ```

## UI Components

### NotificationBell
- **Emplacement** : `components/notifications/notification-bell.tsx`
- **Position** : dans le header du dashboard, avant le `<UserMenu />`
- **Comportement** :
  - Icone `Bell` (lucide-react) si 0 non-lues
  - Icone `BellDot` ou `Bell` avec badge rouge si >= 1 non-lue
  - Le badge affiche le nombre exact (1-9), puis "9+" au-dela
  - Clic sur l'icone ouvre le `<NotificationPopover />`
- **Data** : `useQuery(api.notifications.unreadCount)` — reactif en temps reel
- **Code** :
  ```tsx
  "use client"

  import { useQuery } from "convex/react"
  import { api } from "@/convex/_generated/api"
  import { Bell } from "lucide-react"
  import { Button } from "@/components/ui/button"
  import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
  import { NotificationPopover } from "./notification-popover"

  export function NotificationBell() {
    const unreadCount = useQuery(api.notifications.unreadCount)

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount != null && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <NotificationPopover />
        </PopoverContent>
      </Popover>
    )
  }
  ```

### NotificationPopover
- **Emplacement** : `components/notifications/notification-popover.tsx`
- **Structure** :
  - Header : titre "Notifications" + bouton "Tout marquer comme lu" (icone `CheckCheck`)
  - Body : `<ScrollArea>` avec liste de `<NotificationItem />` (max-height ~400px)
  - Footer : aucun (pas de page dediee dans le MVP)
  - Empty state : "Aucune notification" avec icone `Bell` grisee
- **Data** : `useQuery(api.notifications.listMine, { limit: 20 })`
- **Actions** :
  - Bouton "Tout marquer comme lu" appelle `useMutation(api.notifications.markAllAsRead)`
  - Ce bouton est desactive si aucune notification non-lue

### NotificationItem
- **Emplacement** : `components/notifications/notification-item.tsx`
- **Props** : `notification: Notification`
- **Affichage** :
  - Indicateur visuel non-lue : point bleu a gauche (ou background legerement teinté)
  - Icone par type :
    - `echeance_proche` : `Clock` (orange)
    - `echeance_depassee` : `AlertTriangle` (rouge)
    - `ticket_cree` : `Ticket` (bleu)
    - `tache_assignee` : `UserPlus` (vert emeraude)
  - Titre en gras
  - Message en texte secondaire (text-muted-foreground), tronque a 2 lignes
  - Date relative (ex: "il y a 5 min", "il y a 2h", "hier") — utiliser une fonction utilitaire `formatRelativeDate`
- **Interactions** :
  - Clic sur l'item :
    1. Appelle `markAsRead({ id })` si `isRead === false`
    2. Navigate vers `notification.lien` si defini (via `useRouter().push()`)
  - Pas de bouton de suppression (MVP)

## Fonction utilitaire : formatRelativeDate

```typescript
// lib/format-relative-date.ts
export function formatRelativeDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "A l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days === 1) return "Hier"
  if (days < 7) return `Il y a ${days} jours`
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}
```

## User Stories

### US-1: Recevoir une notification en temps reel
En tant qu'utilisateur connecte, je veux voir apparaitre un badge sur l'icone cloche des qu'un evenement me concerne, sans recharger la page.
- [ ] L'icone cloche est visible dans le header du dashboard
- [ ] Un badge rouge avec le nombre de non-lues apparait en temps reel
- [ ] Le badge disparait quand toutes les notifications sont lues
- [ ] Le badge affiche "9+" au-dela de 9 notifications non-lues
- [ ] La mise a jour est instantanee (Convex subscription reactive)

### US-2: Consulter et interagir avec mes notifications
En tant qu'utilisateur, je veux ouvrir le popover de notifications, voir la liste, et naviguer vers l'objet concerne.
- [ ] Clic sur la cloche ouvre un popover avec la liste des 20 dernieres notifications
- [ ] Chaque notification affiche : icone type, titre, message (tronque), date relative
- [ ] Les notifications non-lues ont un indicateur visuel (point bleu ou fond teinte)
- [ ] Clic sur une notification la marque comme lue et redirige vers le lien associe
- [ ] Bouton "Tout marquer comme lu" dans le header du popover
- [ ] Etat vide : message "Aucune notification" avec icone grisee

### US-3: Etre alerte sur les echeances de mes taches
En tant que collaborateur, je veux recevoir une notification 3 jours avant l'echeance d'une tache qui m'est assignee, et une autre si l'echeance est depassee.
- [ ] A J-3, je recois une notification "Echeance dans 3 jours : {nom}"
- [ ] Apres l'echeance, je recois une notification "Echeance depassee : {nom}"
- [ ] Le manager du client est aussi notifie en cas de depassement
- [ ] Pas de doublon : une seule notification par tache par jour pour le meme type
- [ ] Clic sur la notification m'emmene vers le run contenant la tache

## Edge Cases

### Anti-doublon
- Le cron tourne tous les jours : une tache en retard depuis 5 jours ne doit pas generer 5 notifications "echeance_depassee". Avant chaque creation, verifier qu'il n'existe pas de notification avec le meme `userId + type + relatedId` creee dans les dernieres 24h.
- Implementation : dans `notifications.create`, requete avec les 3 champs, filtre `createdAt > Date.now() - 86400000`. Si resultat existe, skip la creation.

### Marquer comme lue a la navigation
- Quand l'utilisateur clique sur une notification, elle est marquee comme lue AVANT la navigation. Utiliser `await markAsRead({ id })` puis `router.push(lien)`.
- Si `lien` est `undefined`, marquer comme lue sans navigation.

### Etat vide
- Si l'utilisateur n'a aucune notification, afficher un etat vide dans le popover : icone `Bell` grisee + texte "Aucune notification pour le moment."

### Tache sans assigne
- Si une tache n'a pas d'`assigneId`, aucune notification n'est creee pour elle (ni echeance proche, ni echeance depassee). Le cron ignore les taches sans assigne.

### Notification sans lien
- Si `lien` est `undefined`, le clic sur la notification marque uniquement comme lue, sans navigation. Le curseur reste `pointer` mais pas de redirection.

### Performance du cron
- Le cron parcourt toutes les taches non-terminees. Pour un cabinet de taille moyenne (~500 taches actives), c'est acceptable. Si le volume augmente, envisager un index `by_echeance` pour ne requeter que les taches avec echeance dans la fenetre J-3 / J+0.

### Popover et navigation
- Le popover doit se fermer automatiquement quand l'utilisateur clique sur une notification qui a un lien (navigation). Utiliser le state `open` du Popover pour le controler programmatiquement.

### Concurrence markAllAsRead
- Si l'utilisateur a beaucoup de notifications non-lues, `markAllAsRead` fait un batch de patches. Convex gere la transactionnalite, mais limiter a 100 notifications par appel pour eviter les timeouts. Si plus de 100, appeler en boucle cote mutation.

## Structure des fichiers

```
convex/
  notifications.ts           # queries + mutations + internal functions
  crons.ts                   # configuration du cron checkDeadlines

components/
  notifications/
    notification-bell.tsx     # icone cloche avec badge
    notification-popover.tsx  # popover avec liste
    notification-item.tsx     # item individuel

lib/
  format-relative-date.ts    # utilitaire de date relative
```

## Integration avec les autres modules

### Module Tickets (a modifier)
Dans `convex/tickets.ts`, mutation `create` :
- Apres la creation du ticket, appeler `internal.notifications.create` pour notifier le manager du client.

### Module Taches (a modifier)
Dans `convex/taches.ts`, mutation `update` :
- Detecter si `assigneId` a change. Si oui, appeler `internal.notifications.create` pour notifier le nouvel assigne.

### Layout Dashboard (a modifier)
Dans le layout ou header du dashboard :
- Ajouter `<NotificationBell />` dans le header, a cote du `<UserMenu />`.

## Commit
```
feat: implement in-app notifications (bell + cron deadlines)
```
