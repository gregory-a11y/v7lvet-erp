# Meta-Prompt — Module Documents (GED)
> Priority: P1 | Depends on: 00-schema, 01-auth, 02-clients

## Context
Module de Gestion Electronique de Documents (GED) de l'ERP V7LVET. Permet aux utilisateurs du cabinet comptable d'uploader, consulter, telecharger et supprimer des fichiers rattaches a un client, et optionnellement a un dossier ou un run. Les fichiers sont stockes via Convex File Storage. Les categories de documents sont configurables depuis l'interface par l'admin (associe).

Ce module ne gere pas de versioning ni de workflow d'approbation — c'est un stockage structure avec classement par categorie et rattachement aux entites metier.

Reference : `docs/prd.md#documents` et `docs/schema-draft.ts`

## Stack
- Convex: queries, mutations, actions (pour generateUploadUrl)
- Convex File Storage: upload, download, delete de fichiers
- shadcn/ui: Table, Card, Dialog, Form, Input, Select, Badge, Button, DropdownMenu, AlertDialog, Skeleton
- react-hook-form + zod pour les formulaires
- Pas de bibliotheque externe supplementaire

## Data Model
Tables concernees : `documents`, `documentCategories`

### documents
```typescript
documents: defineTable({
  // Fichier
  storageId: v.id("_storage"),   // ID Convex File Storage
  fileName: v.string(),          // Nom original du fichier (ex: "bilan-2025.pdf")
  fileType: v.string(),          // MIME type (ex: "application/pdf")
  fileSize: v.number(),          // Taille en octets

  // Rattachement
  clientId: v.id("clients"),              // Obligatoire — tout document est lie a un client
  dossierId: v.optional(v.id("dossiers")),// Optionnel — lie a un dossier/mission
  runId: v.optional(v.id("runs")),        // Optionnel — lie a un exercice fiscal

  // Classification
  categorieId: v.optional(v.id("documentCategories")), // Categorie configurable

  // Meta
  uploadedBy: v.id("users"),     // Utilisateur qui a uploade le fichier
  notes: v.optional(v.string()), // Commentaire libre sur le document
  createdAt: v.number(),         // Timestamp de l'upload
})
  .index("by_client", ["clientId"])
  .index("by_dossier", ["dossierId"])
  .index("by_run", ["runId"])
  .index("by_categorie", ["categorieId"])
```

### documentCategories
```typescript
documentCategories: defineTable({
  nom: v.string(),                       // Ex: "Bilan", "Liasse fiscale", "Contrat", "Facture"
  description: v.optional(v.string()),   // Description libre
  isActive: v.boolean(),                 // Permet de desactiver sans supprimer
  createdAt: v.number(),
})
  .index("by_nom", ["nom"])
  .index("by_active", ["isActive"])
```

### Differences avec schema-draft.ts
Le schema draft utilise `fileStorageId` (string), `nom`, `mimeType`, `size`, `uploadedById`. Ce meta-prompt renomme pour plus de clarte :
- `fileStorageId` → `storageId` (type `v.id("_storage")` pour typage fort Convex)
- `nom` → `fileName` (evite confusion avec d'autres champs `nom`)
- `mimeType` → `fileType`
- `size` → `fileSize`
- `uploadedById` → `uploadedBy`
- Ajout de `runId` (rattachement aux runs, absent du draft)
- Ajout de `notes` (commentaire libre)
- Ajout de `isActive` sur `documentCategories` (soft delete)

L'implementation finale doit suivre les noms de CE meta-prompt. Mettre a jour le schema si necessaire.

## Auth & Permissions

### Regles d'acces
Les permissions suivent la cascade definie dans `01-auth` (lib/permissions.ts).

| Action         | associe | manager              | collaborateur          | assistante             |
|----------------|---------|----------------------|------------------------|------------------------|
| Upload         | Tous    | Ses clients          | Clients de ses dossiers| Clients de ses dossiers|
| Voir / Lister  | Tous    | Ses clients          | Clients de ses dossiers| Clients de ses dossiers|
| Telecharger    | Tous    | Ses clients          | Clients de ses dossiers| Clients de ses dossiers|
| Supprimer      | Tous    | Ses clients (ses uploads) | Ses propres uploads uniquement | Ses propres uploads uniquement |
| Gerer categories | Oui  | Non                  | Non                    | Non                    |

### Regles specifiques
- Un utilisateur ne peut supprimer que les documents qu'il a lui-meme uploades, sauf l'associe qui peut tout supprimer.
- Un manager peut supprimer les documents de ses clients (y compris ceux uploades par ses collaborateurs).
- La visibilite d'un document depend de la visibilite du client auquel il est rattache (cascade).
- La gestion des categories (CRUD) est reservee a l'associe.

## Pages

### Onglet Documents dans /clients/[id]
- **Emplacement** : 6eme tab de la fiche client (apres Tickets)
- **Contenu** : liste de tous les documents rattaches a ce client
- **Filtres** : par categorie (Select), recherche par nom de fichier
- **Tri** : par date d'upload (plus recent en premier) par defaut, triable par nom et taille
- **Actions** : bouton "Uploader un document" (ouvre DocumentUploadDialog)
- **Loading** : Skeleton table (6 rows)
- **Empty** : "Aucun document pour ce client. Uploadez votre premier fichier." + CTA

### Onglet Documents dans /runs/[id]
- **Emplacement** : 3eme tab du detail d'un run (apres Gates)
- **Contenu** : liste des documents rattaches a ce run specifique
- **Meme UI** que l'onglet client mais filtre par runId
- **Upload** : pre-remplit le runId et le clientId du run

### /settings/document-categories — Gestion des categories
- **Acces** : associe uniquement (redirect si autre role)
- **Layout group** : (dashboard)/settings
- **Contenu** : liste des categories avec nom, description, status actif/inactif
- **Actions** : Creer, Modifier (inline ou Dialog), Activer/Desactiver, Supprimer
- **Suppression** : AlertDialog de confirmation, verifier qu'aucun document n'utilise cette categorie
- **Loading** : Skeleton list
- **Empty** : "Aucune categorie. Creez votre premiere categorie de documents."

## Convex Functions

### Queries

#### `documents.listByClient`
Liste les documents d'un client, filtres et tries.
```typescript
// Args
{
  clientId: v.id("clients"),
  categorieId: v.optional(v.id("documentCategories")),
  search: v.optional(v.string()), // recherche sur fileName
}
// Auth: logged in + permission de voir ce client (cascade)
// Returns: Document[] avec categorie.nom resolu (join)
// Tri: createdAt DESC par defaut
```

#### `documents.listByDossier`
Liste les documents rattaches a un dossier specifique.
```typescript
// Args
{ dossierId: v.id("dossiers") }
// Auth: logged in + permission via le client du dossier
// Returns: Document[]
```

#### `documents.listByRun`
Liste les documents rattaches a un run specifique.
```typescript
// Args
{ runId: v.id("runs") }
// Auth: logged in + permission via le client du run
// Returns: Document[]
```

#### `documents.getUrl`
Genere une URL de telechargement temporaire a partir du storageId.
```typescript
// Args
{ storageId: v.id("_storage") }
// Auth: logged in (la verification se fait en amont cote UI)
// Returns: string | null (URL temporaire Convex File Storage)
// Implementation: ctx.storage.getUrl(args.storageId)
```

#### `documentCategories.list`
Liste toutes les categories de documents.
```typescript
// Args: aucun (ou { activeOnly: v.optional(v.boolean()) })
// Auth: logged in
// Returns: DocumentCategory[]
// Note: pour les formulaires d'upload, filtrer activeOnly=true
//        pour la page settings, afficher toutes les categories
```

### Mutations

#### `documents.generateUploadUrl`
Action Convex qui genere une URL d'upload pre-signee vers Convex File Storage.
```typescript
// Type: mutation (ctx.storage.generateUploadUrl())
// Args: aucun
// Auth: logged in
// Returns: string (upload URL)
// Note: c'est une mutation Convex standard, pas une action
```

#### `documents.create`
Enregistre les metadonnees du document apres un upload reussi.
```typescript
// Args
{
  storageId: v.id("_storage"),
  fileName: v.string(),
  fileType: v.string(),
  fileSize: v.number(),
  clientId: v.id("clients"),
  dossierId: v.optional(v.id("dossiers")),
  runId: v.optional(v.id("runs")),
  categorieId: v.optional(v.id("documentCategories")),
  notes: v.optional(v.string()),
}
// Auth: logged in + permission d'upload sur ce client
// Sets: uploadedBy = current user, createdAt = Date.now()
// Returns: documentId
// Validation:
//   - clientId doit exister et etre actif
//   - dossierId doit appartenir au meme client (si fourni)
//   - runId doit appartenir au meme client (si fourni)
//   - categorieId doit exister et etre active (si fourni)
```

#### `documents.delete`
Supprime un document (fichier physique + enregistrement).
```typescript
// Args
{ id: v.id("documents") }
// Auth: associe = tout | manager = ses clients | collab/assistante = ses propres uploads
// Action:
//   1. Recuperer le document
//   2. Verifier les permissions
//   3. ctx.storage.delete(document.storageId) — supprime le fichier
//   4. ctx.db.delete(args.id) — supprime l'enregistrement
// Note: la suppression du fichier et de l'enregistrement doivent etre atomiques
```

#### `documentCategories.create`
Cree une nouvelle categorie de documents.
```typescript
// Args
{
  nom: v.string(),
  description: v.optional(v.string()),
}
// Auth: associe uniquement
// Sets: isActive = true, createdAt = Date.now()
// Validation: nom unique (verifier via index by_nom)
// Returns: categoryId
```

#### `documentCategories.update`
Modifie une categorie existante.
```typescript
// Args
{
  id: v.id("documentCategories"),
  nom: v.optional(v.string()),
  description: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
}
// Auth: associe uniquement
// Validation: si nom change, verifier unicite
```

#### `documentCategories.delete`
Supprime une categorie.
```typescript
// Args
{ id: v.id("documentCategories") }
// Auth: associe uniquement
// Validation: verifier qu'aucun document n'a cette categorieId
//   - Si des documents utilisent cette categorie → erreur:
//     "Impossible de supprimer : X documents utilisent cette categorie.
//      Desactivez-la ou reassignez les documents."
// Action: ctx.db.delete(args.id)
```

## Flux d'upload (etapes cote client)

L'upload avec Convex File Storage se fait en 3 etapes :

```typescript
// 1. Generer l'URL d'upload
const uploadUrl = await generateUploadUrl()

// 2. Uploader le fichier directement vers Convex Storage
const result = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
})
const { storageId } = await result.json()

// 3. Sauvegarder les metadonnees
await createDocument({
  storageId,
  fileName: file.name,
  fileType: file.type,
  fileSize: file.size,
  clientId,
  dossierId,
  runId,
  categorieId,
  notes,
})
```

Ce flux doit etre encapsule dans un hook custom `useUploadDocument` pour reutilisation.

## UI Components

### DocumentList
- **Props** : `documents: Document[]`, `isLoading: boolean`, `onDelete: (id) => void`
- **Affichage** : tableau avec colonnes : Nom du fichier, Categorie (Badge), Taille, Uploade par, Date, Actions
- **Taille** : formater en Ko/Mo (ex: "2.4 Mo")
- **Date** : format relatif ("il y a 3 jours") ou absolu ("25/02/2026") si > 7 jours
- **Actions** (DropdownMenu) : Telecharger, Voir (preview si applicable), Supprimer
- **Icone** : icone dynamique selon fileType (PDF, image, tableur, document texte, autre)
- **Tri** : cliquable sur les en-tetes de colonnes
- **Responsive** : sur mobile, basculer en vue cartes empilees

### DocumentUploadDialog
- **Trigger** : bouton "Uploader un document" (icone Upload + texte)
- **Contenu** :
  - Zone de drag & drop (avec fallback bouton "Parcourir")
  - Champs du formulaire (react-hook-form + zod) :
    - `categorie` : Select des categories actives (optionnel)
    - `notes` : Textarea (optionnel)
    - `dossierId` : Select des dossiers du client (optionnel, pre-rempli si contexte)
    - `runId` : Select des runs du client (optionnel, pre-rempli si contexte)
  - Preview du fichier selectionne : nom, taille, type
  - Barre de progression pendant l'upload
  - Boutons : "Annuler" / "Uploader"
- **Validation zod** :
  ```typescript
  const uploadSchema = z.object({
    file: z.instanceof(File)
      .refine(f => f.size <= 10 * 1024 * 1024, "Taille max : 10 Mo")
      .refine(f => ALLOWED_TYPES.includes(f.type), "Type de fichier non supporte"),
    categorieId: z.string().optional(),
    dossierId: z.string().optional(),
    runId: z.string().optional(),
    notes: z.string().max(500).optional(),
  })
  ```
- **Apres upload** : toast de succes, fermeture du dialog, rafraichissement de la liste
- **En cas d'erreur** : toast d'erreur, le dialog reste ouvert

### DocumentCard
- **Props** : `document: Document`
- **Affichage** : carte compacte avec icone fichier, nom, categorie badge, taille, date
- **Utilise pour** : vue mobile de la DocumentList
- **Actions** : menu contextuel (3 dots) avec Telecharger / Supprimer

### DocumentCategoryManager
- **Page** : /settings/document-categories
- **Affichage** : liste de categories avec Badge actif/inactif
- **Actions inline** :
  - Modifier nom/description (inline editing ou Dialog)
  - Toggle actif/inactif (Switch)
  - Supprimer (AlertDialog)
- **Formulaire d'ajout** : en haut de la liste ou via Dialog
- **Composants shadcn** : Table, Switch, Badge, AlertDialog, Dialog, Input, Button

### useUploadDocument (hook custom)
```typescript
function useUploadDocument() {
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
  const createDocument = useMutation(api.documents.create)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const upload = async (file: File, metadata: DocumentMetadata) => {
    setIsUploading(true)
    setProgress(0)
    try {
      // Step 1: get upload URL
      const uploadUrl = await generateUploadUrl()
      setProgress(25)

      // Step 2: upload file to Convex Storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!result.ok) throw new Error("Upload echoue")
      const { storageId } = await result.json()
      setProgress(75)

      // Step 3: save metadata
      const documentId = await createDocument({
        storageId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        ...metadata,
      })
      setProgress(100)
      return documentId
    } finally {
      setIsUploading(false)
    }
  }

  return { upload, isUploading, progress }
}
```

## Types de fichiers autorises

```typescript
const ALLOWED_TYPES = [
  // PDF
  "application/pdf",
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  // Documents Office
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/msword",        // .doc
  "application/vnd.ms-excel",  // .xls
  // CSV / Texte
  "text/csv",
  "text/plain",
] as const

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
```

## Categories par defaut (seed)

A l'initialisation du module, creer les categories suivantes :

| Nom                    | Description                                    |
|------------------------|------------------------------------------------|
| Bilan                  | Documents de bilan comptable annuel             |
| Liasse fiscale         | Liasses fiscales et annexes                     |
| Contrat                | Contrats et avenants                            |
| Facture                | Factures fournisseurs et clients                |
| Releve bancaire        | Releves de comptes bancaires                    |
| Fiche de paie          | Bulletins de salaire                            |
| Courrier administratif | Courriers URSSAF, impots, greffe               |
| PV d'assemblee         | Proces-verbaux d'assemblees generales           |
| Divers                 | Documents non classes                           |

Ces categories sont creees via un script seed (`convex/seed.ts`) ou manuellement par l'associe au premier lancement.

## User Stories

### US-1 : Uploader un document pour un client
En tant que collaborateur, je veux uploader un fichier pour un client de mon portefeuille.
- [ ] Bouton "Uploader un document" visible dans l'onglet Documents de la fiche client
- [ ] Le dialog s'ouvre avec une zone de drag & drop
- [ ] Je peux selectionner un fichier depuis mon ordinateur ou le glisser-deposer
- [ ] Je peux choisir une categorie dans la liste des categories actives
- [ ] Je peux ajouter une note optionnelle
- [ ] Pendant l'upload, une barre de progression est affichee
- [ ] Apres l'upload, le dialog se ferme et la liste se met a jour
- [ ] Toast de confirmation : "Document uploade avec succes"
- [ ] Si le fichier depasse 10 Mo, message d'erreur avant l'envoi
- [ ] Si le type de fichier n'est pas supporte, message d'erreur avant l'envoi

### US-2 : Consulter et telecharger les documents d'un client
En tant que manager, je veux voir la liste des documents d'un client et les telecharger.
- [ ] L'onglet Documents affiche un tableau avec tous les documents du client
- [ ] Je peux filtrer par categorie via un Select
- [ ] Je peux chercher par nom de fichier
- [ ] Clic sur "Telecharger" ouvre le fichier dans un nouvel onglet ou lance le telechargement
- [ ] Les fichiers PDF et images peuvent etre previsualises (preview inline ou nouvel onglet)
- [ ] La taille du fichier est affichee en format lisible (Ko/Mo)
- [ ] La date d'upload est affichee en format relatif ou absolu

### US-3 : Supprimer un document
En tant qu'associe, je veux pouvoir supprimer n'importe quel document.
- [ ] Clic sur "Supprimer" dans le menu d'actions ouvre un AlertDialog de confirmation
- [ ] Le message indique le nom du fichier a supprimer
- [ ] Apres confirmation, le fichier est supprime de Convex Storage ET de la base
- [ ] La liste se met a jour immediatement
- [ ] Toast de confirmation : "Document supprime"
- [ ] Un collaborateur ne peut supprimer que ses propres uploads
- [ ] Un manager peut supprimer les documents de ses clients

### US-4 : Gerer les categories de documents
En tant qu'associe, je veux configurer les categories de documents depuis les parametres.
- [ ] Page /settings/document-categories accessible depuis le menu Settings
- [ ] Liste des categories avec nom, description, status actif/inactif
- [ ] Bouton "Ajouter une categorie" ouvre un formulaire
- [ ] Le nom de la categorie est obligatoire et unique
- [ ] Je peux activer/desactiver une categorie via un toggle Switch
- [ ] Une categorie desactivee n'apparait plus dans les Selects d'upload mais les documents existants la conservent
- [ ] Supprimer une categorie utilisee par des documents → message d'erreur explicatif
- [ ] Supprimer une categorie inutilisee → AlertDialog + suppression

### US-5 : Documents lies a un run
En tant que collaborateur, je veux uploader des documents directement depuis un run.
- [ ] L'onglet Documents du run affiche uniquement les documents rattaches a ce run
- [ ] Le dialog d'upload pre-remplit le clientId et le runId
- [ ] Je peux ajouter une categorie et des notes comme pour un upload client

## Edge Cases

### Taille et type de fichier
- Fichier > 10 Mo → validation cote client AVANT l'upload, message : "Ce fichier depasse la taille maximale autorisee (10 Mo)"
- Type MIME non supporte → validation cote client AVANT l'upload, message : "Ce type de fichier n'est pas supporte. Types acceptes : PDF, images, documents Office, CSV"
- Fichier vide (0 octets) → rejeter avec message "Le fichier selectionne est vide"

### Echec d'upload
- Erreur reseau pendant l'upload → toast d'erreur "L'upload a echoue. Verifiez votre connexion et reessayez."
- Le dialog reste ouvert avec le fichier selectionne pour permettre un nouvel essai
- Si l'upload (etape 2) reussit mais la sauvegarde des metadonnees (etape 3) echoue → fichier orphelin dans le storage. Prevoir un cron job de nettoyage (optionnel MVP+).

### Suppression
- Confirmation obligatoire via AlertDialog : "Etes-vous sur de vouloir supprimer le document {fileName} ? Cette action est irreversible."
- Suppression d'un document pendant qu'un autre utilisateur le consulte → l'URL de download expirera naturellement

### Categories
- Supprimer une categorie avec des documents associes → erreur bloquante, pas de suppression en cascade
- Desactiver une categorie → les documents existants gardent leur categorieId, mais la categorie n'apparait plus dans les nouveaux uploads
- Deux categories avec le meme nom → empecher via validation unicite

### Permissions
- Collaborateur tente de supprimer un document uploade par un autre → erreur 403 : "Vous ne pouvez supprimer que vos propres documents"
- Utilisateur sans acces au client tente d'acceder aux documents → erreur 403 via la cascade de permissions

### Concurrence
- Upload simultane du meme fichier par deux utilisateurs → les deux sont acceptes (pas de deduplication au MVP)
- Suppression d'un document pendant un telechargement en cours → le telechargement peut echouer, pas de gestion speciale au MVP

## Arborescence des fichiers a creer

```
convex/
  documents.ts                    # Queries + mutations pour documents
  documentCategories.ts           # Queries + mutations pour categories
app/
  (dashboard)/
    clients/
      [id]/
        _components/
          documents-tab.tsx       # Onglet Documents de la fiche client
    runs/
      [id]/
        _components/
          documents-tab.tsx       # Onglet Documents du run
    settings/
      document-categories/
        page.tsx                  # Page de gestion des categories
components/
  documents/
    document-list.tsx             # DocumentList (tableau)
    document-card.tsx             # DocumentCard (vue mobile)
    document-upload-dialog.tsx    # DocumentUploadDialog (formulaire d'upload)
    document-category-manager.tsx # DocumentCategoryManager (CRUD categories)
hooks/
  use-upload-document.ts          # Hook custom pour le flux d'upload
lib/
  file-utils.ts                   # formatFileSize(), getFileIcon(), ALLOWED_TYPES
```

## Commit
```
feat: implement documents module (GED + upload + categories)
```
