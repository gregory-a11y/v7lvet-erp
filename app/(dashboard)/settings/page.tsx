"use client"

import { useMutation, useQuery } from "convex/react"
import { Plus, Settings, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useSession } from "@/lib/auth-client"

// ---------------------------------------------------------------------------
// Generic CRUD section component
// ---------------------------------------------------------------------------

interface ConfigItem {
	_id: string
	nom: string
	description?: string
}

function ConfigSection<T extends ConfigItem>({
	title,
	items,
	onCreate,
	onRemove,
	extraFields,
}: {
	title: string
	items: T[] | undefined
	onCreate: (data: { nom: string; description: string }) => Promise<void>
	onRemove: (id: string) => Promise<void>
	extraFields?: React.ReactNode
}) {
	const [open, setOpen] = useState(false)
	const [nom, setNom] = useState("")
	const [description, setDescription] = useState("")

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		if (!nom.trim()) {
			toast.error("Le nom est obligatoire")
			return
		}
		try {
			await onCreate({ nom: nom.trim(), description: description.trim() })
			toast.success(`${title} ajouté`)
			setOpen(false)
			setNom("")
			setDescription("")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	async function handleRemove(id: string, itemNom: string) {
		try {
			await onRemove(id)
			toast.success(`"${itemNom}" supprimé`)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de la suppression")
		}
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{title}</CardTitle>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button size="sm">
							<Plus className="mr-2 h-4 w-4" />
							Ajouter
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Ajouter — {title}</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreate} className="space-y-4">
							<div>
								<Label htmlFor={`nom-${title}`}>Nom *</Label>
								<Input
									id={`nom-${title}`}
									value={nom}
									onChange={(e) => setNom(e.target.value)}
									required
								/>
							</div>
							<div>
								<Label htmlFor={`desc-${title}`}>Description</Label>
								<Textarea
									id={`desc-${title}`}
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={3}
								/>
							</div>
							{extraFields}
							<Button type="submit" className="w-full">
								Créer
							</Button>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent>
				{items === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : items.length === 0 ? (
					<p className="text-sm text-muted-foreground py-6 text-center">Aucun élément configuré.</p>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nom</TableHead>
									<TableHead className="hidden md:table-cell">Description</TableHead>
									<TableHead className="w-24 text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((item) => (
									<TableRow key={item._id}>
										<TableCell className="font-medium">{item.nom}</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{item.description || "—"}
										</TableCell>
										<TableCell className="text-right">
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button variant="ghost" size="icon">
														<Trash2 className="h-4 w-4 text-destructive" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
														<AlertDialogDescription>
															Supprimer &laquo;&nbsp;{item.nom}&nbsp;&raquo; ? Cette action est
															irréversible.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Annuler</AlertDialogCancel>
														<AlertDialogAction onClick={() => handleRemove(item._id, item.nom)}>
															Supprimer
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
	const { data: session } = useSession()
	const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

	// Queries
	const ticketTypes = useQuery(api.tickets.listTypes)
	const gateTemplates = useQuery(api.gates.listTemplates)
	const docCategories = useQuery(api.documents.listCategories)

	// Mutations
	const createTicketType = useMutation(api.tickets.createType)
	const removeTicketType = useMutation(api.tickets.removeType)
	const createGateTemplate = useMutation(api.gates.createTemplate)
	const removeGateTemplate = useMutation(api.gates.removeTemplate)
	const createDocCategory = useMutation(api.documents.createCategory)
	const removeDocCategory = useMutation(api.documents.removeCategory)

	// Permission guard
	if (userRole !== "associe") {
		return (
			<div className="flex items-center justify-center h-full py-20">
				<p className="text-muted-foreground text-lg">Accès réservé aux associés.</p>
			</div>
		)
	}

	return (
		<div>
			<PageHeader
				title="Administration"
				description="Configuration des entités du cabinet"
				actions={
					<div className="flex items-center gap-2 text-muted-foreground">
						<Settings className="h-5 w-5" />
					</div>
				}
			/>

			<div className="px-6 py-6">
				<Tabs defaultValue="ticket-types">
					<TabsList className="mb-4">
						<TabsTrigger value="ticket-types">Types de tickets</TabsTrigger>
						<TabsTrigger value="gate-templates">Templates de gates</TabsTrigger>
						<TabsTrigger value="doc-categories">Catégories de documents</TabsTrigger>
					</TabsList>

					{/* Tab: Types de tickets */}
					<TabsContent value="ticket-types">
						<ConfigSection
							title="Types de tickets"
							items={ticketTypes as ConfigItem[] | undefined}
							onCreate={async ({ nom, description }) => {
								await createTicketType({
									nom,
									description: description || undefined,
								})
							}}
							onRemove={async (id) => {
								await removeTicketType({
									id: id as Id<"ticketTypes">,
								})
							}}
						/>
					</TabsContent>

					{/* Tab: Templates de gates */}
					<TabsContent value="gate-templates">
						<ConfigSection
							title="Templates de gates"
							items={gateTemplates as ConfigItem[] | undefined}
							onCreate={async ({ nom, description }) => {
								await createGateTemplate({
									nom,
									description: description || undefined,
									ordre: Date.now(),
								})
							}}
							onRemove={async (id) => {
								await removeGateTemplate({
									id: id as Id<"gateTemplates">,
								})
							}}
						/>
					</TabsContent>

					{/* Tab: Catégories de documents */}
					<TabsContent value="doc-categories">
						<ConfigSection
							title="Catégories de documents"
							items={docCategories as ConfigItem[] | undefined}
							onCreate={async ({ nom, description }) => {
								await createDocCategory({
									nom,
									description: description || undefined,
								})
							}}
							onRemove={async (id) => {
								await removeDocCategory({
									id: id as Id<"documentCategories">,
								})
							}}
						/>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
