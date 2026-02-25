"use client"

import { useMutation, useQuery } from "convex/react"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

const COLONNES: { key: string; label: string; color: string }[] = [
	{ key: "prospect", label: "Prospect", color: "bg-gray-100" },
	{ key: "contact", label: "Contact", color: "bg-blue-50" },
	{ key: "proposition", label: "Proposition", color: "bg-purple-50" },
	{ key: "negociation", label: "Négociation", color: "bg-amber-50" },
	{ key: "gagne", label: "Gagné", color: "bg-emerald-50" },
	{ key: "perdu", label: "Perdu", color: "bg-red-50" },
]

const SOURCE_LABELS: Record<string, string> = {
	recommandation: "Recommandation",
	reseau: "Réseau",
	site_web: "Site web",
	salon: "Salon",
	autre: "Autre",
}

export default function OpportunitesPage() {
	const { getMemberName } = useTeamMembers()
	const opportunites = useQuery(api.opportunites.list, {})
	const create = useMutation(api.opportunites.create)
	const update = useMutation(api.opportunites.update)
	const remove = useMutation(api.opportunites.remove)
	const convertToClient = useMutation(api.opportunites.convertToClient)

	const [dialogOpen, setDialogOpen] = useState(false)
	const [convertDialog, setConvertDialog] = useState<{
		id: Id<"opportunites">
		nom: string
	} | null>(null)
	const [convertNom, setConvertNom] = useState("")
	const [form, setForm] = useState({
		nom: "",
		statut: "prospect" as const,
		source: "" as string,
		contactNom: "",
		contactEmail: "",
		montantEstime: "",
		notes: "",
	})

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		try {
			await create({
				nom: form.nom,
				statut: form.statut,
				source: (form.source || undefined) as any,
				contactNom: form.contactNom || undefined,
				contactEmail: form.contactEmail || undefined,
				montantEstime: form.montantEstime ? Number(form.montantEstime) : undefined,
				notes: form.notes || undefined,
			})
			toast.success("Opportunité créée")
			setDialogOpen(false)
			setForm({
				nom: "",
				statut: "prospect",
				source: "",
				contactNom: "",
				contactEmail: "",
				montantEstime: "",
				notes: "",
			})
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	async function handleStatusChange(id: Id<"opportunites">, statut: string) {
		try {
			await update({ id, statut: statut as any })
		} catch {
			toast.error("Erreur")
		}
	}

	async function handleRemove(id: Id<"opportunites">) {
		try {
			await remove({ id })
			toast.success("Opportunité supprimée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	async function handleConvert(e: React.FormEvent) {
		e.preventDefault()
		if (!convertDialog) return
		try {
			const _clientId = await convertToClient({ id: convertDialog.id, raisonSociale: convertNom })
			toast.success("Converti en client")
			setConvertDialog(null)
			setConvertNom("")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div>
			<PageHeader
				title="Opportunités"
				description="Suivi du pipeline commercial"
				actions={
					<Button onClick={() => setDialogOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Nouvelle opportunité
					</Button>
				}
			/>

			{/* Kanban */}
			<div className="px-6 pt-4 overflow-x-auto">
				<div className="flex gap-4 min-w-max pb-4">
					{COLONNES.map((col) => {
						const cards = (opportunites ?? []).filter((o) => o.statut === col.key)
						return (
							<div key={col.key} className="w-64 flex-shrink-0">
								<div className="flex items-center justify-between mb-2">
									<span className="font-medium text-sm">{col.label}</span>
									<Badge variant="secondary" className="text-xs">
										{cards.length}
									</Badge>
								</div>
								<div className={`rounded-lg p-2 space-y-2 min-h-32 ${col.color}`}>
									{cards.map((opp) => (
										<div
											key={opp._id}
											className="bg-white rounded-md border p-3 space-y-2 shadow-sm"
										>
											<div className="font-medium text-sm">{opp.nom}</div>
											{opp.source && (
												<div className="text-xs text-muted-foreground">
													{SOURCE_LABELS[opp.source] ?? opp.source}
												</div>
											)}
											{opp.contactNom && (
												<div className="text-xs text-muted-foreground">{opp.contactNom}</div>
											)}
											{opp.montantEstime && (
												<div className="text-xs font-medium text-emerald-700">
													{opp.montantEstime.toLocaleString("fr-FR")} €
												</div>
											)}
											{opp.responsableId && (
												<div className="text-xs text-muted-foreground">
													{getMemberName(opp.responsableId)}
												</div>
											)}

											{/* Change statut */}
											<Select
												value={opp.statut}
												onValueChange={(val) => handleStatusChange(opp._id, val)}
											>
												<SelectTrigger className="h-7 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{COLONNES.map((c) => (
														<SelectItem key={c.key} value={c.key}>
															{c.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>

											<div className="flex gap-1">
												{opp.statut === "negociation" && (
													<Button
														size="sm"
														variant="outline"
														className="h-6 text-xs flex-1"
														onClick={() => {
															setConvertDialog({ id: opp._id, nom: opp.nom })
															setConvertNom(opp.nom)
														}}
													>
														→ Client
													</Button>
												)}
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button size="sm" variant="ghost" className="h-6 text-destructive px-2">
															<Trash2 className="h-3 w-3" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>Supprimer "{opp.nom}" ?</AlertDialogTitle>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Annuler</AlertDialogCancel>
															<AlertDialogAction onClick={() => handleRemove(opp._id)}>
																Supprimer
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</div>
										</div>
									))}
								</div>
							</div>
						)
					})}
				</div>
			</div>

			{/* Dialog créer */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Nouvelle opportunité</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreate} className="space-y-4">
						<div>
							<Label>Nom *</Label>
							<Input
								value={form.nom}
								onChange={(e) => setForm({ ...form, nom: e.target.value })}
								required
							/>
						</div>
						<div>
							<Label>Statut</Label>
							<Select
								value={form.statut}
								onValueChange={(v) => setForm({ ...form, statut: v as any })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{COLONNES.map((c) => (
										<SelectItem key={c.key} value={c.key}>
											{c.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Source</Label>
							<Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
								<SelectTrigger>
									<SelectValue placeholder="Choisir une source" />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(SOURCE_LABELS).map(([k, v]) => (
										<SelectItem key={k} value={k}>
											{v}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Nom contact</Label>
								<Input
									value={form.contactNom}
									onChange={(e) => setForm({ ...form, contactNom: e.target.value })}
								/>
							</div>
							<div>
								<Label>Email contact</Label>
								<Input
									type="email"
									value={form.contactEmail}
									onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
								/>
							</div>
						</div>
						<div>
							<Label>Montant estimé (€)</Label>
							<Input
								type="number"
								value={form.montantEstime}
								onChange={(e) => setForm({ ...form, montantEstime: e.target.value })}
								min="0"
							/>
						</div>
						<div>
							<Label>Notes</Label>
							<Textarea
								value={form.notes}
								onChange={(e) => setForm({ ...form, notes: e.target.value })}
								rows={3}
							/>
						</div>
						<Button type="submit" className="w-full">
							Créer
						</Button>
					</form>
				</DialogContent>
			</Dialog>

			{/* Dialog convertir en client */}
			<Dialog open={!!convertDialog} onOpenChange={(o) => !o && setConvertDialog(null)}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Convertir en client</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleConvert} className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Créer un client à partir de &laquo; {convertDialog?.nom} &raquo;.
						</p>
						<div>
							<Label>Raison sociale *</Label>
							<Input value={convertNom} onChange={(e) => setConvertNom(e.target.value)} required />
						</div>
						<Button type="submit" className="w-full">
							Convertir
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
