"use client"

import { useMutation, useQuery } from "convex/react"
import { Archive, FolderOpen, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useSession } from "@/lib/auth-client"
import { STATUS_LABELS, TYPES_DOSSIER } from "@/lib/constants"

const TYPE_COLORS: Record<string, string> = {
	compta: "bg-blue-100 text-blue-800",
	paie: "bg-purple-100 text-purple-800",
	audit: "bg-orange-100 text-orange-800",
	conseil: "bg-green-100 text-green-800",
	fiscal: "bg-emerald-100 text-emerald-800",
}

export function DossiersTab({ clientId }: { clientId: Id<"clients"> }) {
	const dossiers = useQuery(api.dossiers.listByClient, { clientId })
	const createDossier = useMutation(api.dossiers.create)
	const archiveDossier = useMutation(api.dossiers.archive)
	const { data: session } = useSession()
	const [open, setOpen] = useState(false)

	const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
	const canCreate = userRole === "associe" || userRole === "manager"
	const canArchive = userRole === "associe"

	async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const form = new FormData(e.currentTarget)
		const type = form.get("type") as string
		if (!type) {
			toast.error("Le type est obligatoire")
			return
		}

		try {
			await createDossier({
				clientId,
				nom: `${TYPES_DOSSIER.find((t) => t.value === type)?.label ?? type} ${form.get("exercice") || ""}`.trim(),
				type,
				exercice: (form.get("exercice") as string) || undefined,
				managerId: (form.get("managerId") as string) || undefined,
				collaborateurId: (form.get("collaborateurId") as string) || undefined,
				notes: (form.get("notes") as string) || undefined,
			})
			toast.success("Dossier créé")
			setOpen(false)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de la création")
		}
	}

	async function handleArchive(dossierId: Id<"dossiers">) {
		try {
			await archiveDossier({ id: dossierId })
			toast.success("Dossier archivé")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de l'archivage")
		}
	}

	if (dossiers === undefined) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Dossiers ({dossiers.length})</h3>
				{canCreate && (
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button size="sm">
								<Plus className="mr-2 h-4 w-4" />
								Nouveau dossier
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Nouveau dossier</DialogTitle>
							</DialogHeader>
							<form onSubmit={handleCreate} className="space-y-4">
								<div className="grid gap-3 sm:grid-cols-2">
									<div>
										<Label>Type *</Label>
										<Select name="type" required>
											<SelectTrigger>
												<SelectValue placeholder="Sélectionner" />
											</SelectTrigger>
											<SelectContent>
												{TYPES_DOSSIER.map((t) => (
													<SelectItem key={t.value} value={t.value}>
														{t.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div>
										<Label htmlFor="exercice">Exercice</Label>
										<Input id="exercice" name="exercice" placeholder="2025" maxLength={9} />
									</div>
								</div>
								<div>
									<Label htmlFor="notes">Notes</Label>
									<Textarea
										id="notes"
										name="notes"
										rows={2}
										placeholder="Informations sur la mission..."
									/>
								</div>
								<Button type="submit" className="w-full">
									Créer le dossier
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</div>

			{dossiers.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					<FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
					<p>Aucun dossier pour ce client.</p>
					{canCreate && <p className="text-sm mt-1">Créez une mission pour commencer.</p>}
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Type</TableHead>
								<TableHead>Nom</TableHead>
								<TableHead className="hidden md:table-cell">Exercice</TableHead>
								<TableHead>Status</TableHead>
								{canArchive && <TableHead className="w-16">Actions</TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{dossiers.map((dossier) => (
								<TableRow key={dossier._id}>
									<TableCell>
										<Badge variant="secondary" className={TYPE_COLORS[dossier.type] ?? ""}>
											{TYPES_DOSSIER.find((t) => t.value === dossier.type)?.label ?? dossier.type}
										</Badge>
									</TableCell>
									<TableCell className="font-medium">{dossier.nom}</TableCell>
									<TableCell className="hidden md:table-cell text-muted-foreground">
										{dossier.exercice ?? "—"}
									</TableCell>
									<TableCell>
										<Badge variant={dossier.status === "actif" ? "default" : "secondary"}>
											{STATUS_LABELS[dossier.status] ?? dossier.status}
										</Badge>
									</TableCell>
									{canArchive && (
										<TableCell>
											{dossier.status === "actif" && (
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-muted-foreground hover:text-destructive"
														>
															<Archive className="h-4 w-4" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>Archiver ce dossier ?</AlertDialogTitle>
															<AlertDialogDescription>
																Le dossier sera archivé. Les runs liés ne seront pas affectés.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Annuler</AlertDialogCancel>
															<AlertDialogAction onClick={() => handleArchive(dossier._id)}>
																Archiver
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											)}
										</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	)
}
