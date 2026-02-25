# Meta-Prompt — Module Dashboard
> Priority: P0 | Depends on: 00-schema, 01-auth, 02-clients, 03-runs, 04-taches, 06-tickets

## Context
Le dashboard est la page d'accueil après connexion. Il offre 3 vues complémentaires :
1. **Vue d'ensemble** — KPIs globaux, échéances imminentes, alertes
2. **Vue Timeline** — vue Gantt des runs et échéances (IMPÉRATIF)
3. **Vue Performance Équipe** — charge de travail et productivité par collaborateur

Le contenu est filtré selon le rôle de l'utilisateur (cascade). L'associé voit tout, le manager voit son portefeuille, le collaborateur voit ses tâches.

## Stack
- Convex: queries
- shadcn/ui: Card, Badge, Table, Tabs, Skeleton, Progress
- recharts: graphiques (barres, donuts)
- Vue Gantt : même composant que le module Runs (RunGanttChart)
- Pas de bibliothèque externe supplémentaire

## Auth & Permissions
- **Accès** : tous les rôles authentifiés
- **Données visibles** : filtrées par rôle cascade
  - Associé : tout le cabinet
  - Manager : ses clients + équipe
  - Collaborateur : ses tâches assignées
  - Assistante : les tickets + documents de ses dossiers

## Pages

### /dashboard — Dashboard principal
- **Layout group** : (dashboard)
- **3 onglets** via Tabs (shadcn) :

#### Tab 1 — Vue d'ensemble
**KPI Cards** (ligne de 4 ou 5 cartes en haut) :
| KPI | Description | Icône |
|-----|-------------|-------|
| Tâches en cours | Nombre de tâches avec status "en_cours" | ClipboardList |
| Échéances cette semaine | Tâches avec dateEcheance dans les 7 prochains jours | Calendar |
| En retard | Tâches dont dateEcheance < today ET status !== "termine" | AlertTriangle |
| Tickets ouverts | Nombre de tickets avec status "ouvert" ou "en_cours" | TicketIcon |
| Clients actifs | Nombre de clients avec status "actif" | Building |

**Section "Échéances imminentes"** :
- Table des 10 prochaines tâches par date d'échéance
- Colonnes : Nom, Client, Échéance (relative: "dans 2 jours"), Status, Assigné
- Badge "En retard" rouge si dépassé
- Lien "Voir toutes les tâches →"

**Section "Tickets récents"** :
- Table des 5 derniers tickets ouverts
- Colonnes : Titre, Client, Priorité (badge coloré), Créé par, Date
- Lien "Voir tous les tickets →"

**Section "Activité récente"** (optionnel MVP) :
- Liste des dernières actions : tâches terminées, runs créés, tickets résolus
- 10 dernières entrées

#### Tab 2 — Vue Timeline (Gantt)
- **Réutilise le composant RunGanttChart** du module 03-runs
- Affiche tous les runs de l'année en cours
- Filtres : par manager, par client, par status
- Navigation temporelle : mois précédent/suivant
- Marqueurs d'échéances avec couleurs de status
- Vue par défaut : trimestre courant

#### Tab 3 — Vue Performance Équipe
**Visible uniquement pour** : associé + manager

**Section "Charge par collaborateur"** :
- Graphique à barres (recharts) : nombre de tâches par collaborateur
  - Barres empilées : a_venir (gris), en_cours (bleu), en_attente (orange), termine (vert)
- Table en dessous : Collaborateur, Total tâches, En cours, En retard, Terminées

**Section "Taux de complétion"** :
- Donut chart (recharts) : répartition des status des tâches
  - a_venir, en_cours, en_attente, termine

**Section "Runs par client"** :
- Table : Client, Nb runs actifs, Nb tâches restantes, Prochaine échéance
- Tri par "Prochaine échéance" ASC

- **Loading** : Skeleton cards + skeleton charts
- **Responsive** :
  - Desktop : KPI cards en grille 4-5 colonnes, tables complètes
  - Tablet : KPI cards 2-3 colonnes, tables scrollables
  - Mobile : KPI cards empilées, tables deviennent des cards

## Convex Functions

### Queries
- `dashboard.overview` — KPIs globaux
  - Auth: logged in, filtré par rôle
  - Returns:
    ```typescript
    {
      tachesEnCours: number,
      echeancesCetteSemaine: number,
      enRetard: number,
      ticketsOuverts: number,
      clientsActifs: number,
    }
    ```

- `dashboard.upcomingDeadlines` — Prochaines échéances
  - Auth: logged in, filtré par rôle
  - Params: `{ limit?: number }` (default 10)
  - Returns: `{ nom, clientName, dateEcheance, status, assigneNom, tacheId }[]`

- `dashboard.recentTickets` — Tickets récents
  - Auth: logged in, filtré par rôle
  - Params: `{ limit?: number }` (default 5)
  - Returns: `{ titre, clientName, priorite, createdByNom, createdAt, ticketId }[]`

- `dashboard.teamPerformance` — Stats équipe (associé + manager)
  - Auth: associé ou manager
  - Returns:
    ```typescript
    {
      parCollaborateur: {
        nom: string,
        total: number,
        enCours: number,
        enRetard: number,
        terminees: number,
      }[],
      repartitionStatus: {
        aVenir: number,
        enCours: number,
        enAttente: number,
        termine: number,
      },
      runsParClient: {
        clientName: string,
        nbRunsActifs: number,
        nbTachesRestantes: number,
        prochaineEcheance: string | null,
      }[],
    }
    ```

- `dashboard.ganttData` — Données pour la vue Gantt
  - Auth: logged in, filtré par rôle
  - Params: `{ exercice?: number, managerId?, clientId?, status? }`
  - Returns: `{ runs: Run[], taches: Tache[], clients: Client[] }` — structurés pour le composant Gantt

## UI Components

### DashboardKPICards
- Grille de 4-5 Card (shadcn) avec icône, valeur numérique, label
- Animation de comptage au chargement (optionnel)
- Couleur accent pour "En retard" (rouge)

### DeadlineTable
- Table shadcn des prochaines échéances
- Date affichée en relatif ("dans 2 jours", "hier")
- Badge status coloré
- Clic sur ligne → navigate vers /taches/[id]

### TeamPerformanceChart
- BarChart recharts (barres empilées par collaborateur)
- PieChart recharts (répartition des status)
- Responsive : graphiques redimensionnables

### RunGanttChart (réutilisé du module 03)
- Même composant que /runs
- Peut être configuré en mode "embedded" (sans actions de création)

## User Stories

### US-1: Voir mon dashboard
En tant que collaborateur, je veux voir un résumé de ma charge de travail à la connexion.
- [ ] Les KPI cards affichent mes chiffres personnels
- [ ] Les échéances imminentes montrent mes tâches assignées
- [ ] Les tâches en retard sont mises en évidence
- [ ] Les données se mettent à jour en temps réel

### US-2: Voir la timeline Gantt
En tant que manager, je veux voir la timeline de tous les runs de mes clients.
- [ ] Vue Gantt avec tous les runs de l'année
- [ ] Je peux filtrer par client ou status
- [ ] Les marqueurs d'échéance sont colorés par status
- [ ] Je peux naviguer mois par mois

### US-3: Voir la performance de mon équipe
En tant qu'associé, je veux voir les statistiques de productivité de l'équipe.
- [ ] Graphique de charge par collaborateur
- [ ] Donut de répartition des status
- [ ] Table des runs par client avec prochaines échéances
- [ ] Données filtrées : manager voit son équipe, associé voit tout

## Edge Cases
- Nouveau cabinet sans données → dashboard vide avec CTA "Créez votre premier client"
- Collaborateur sans tâches assignées → KPIs à 0, message encourageant
- Onglet Performance non visible pour collaborateur/assistante
- Très grand nombre de runs → pagination ou virtualisation du Gantt
- Pas de tâches en retard → KPI "En retard" à 0, pas de couleur rouge

## Commit
```
feat: implement dashboard (KPIs + Gantt timeline + team performance)
```
