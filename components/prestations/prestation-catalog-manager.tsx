"use client"

import { Archive, Package, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import {
	useAllPrestationsCatalog,
	useArchivePrestation,
	useCreatePrestation,
	useReactivatePrestation,
	useUpdatePrestation,
} from "@/lib/hooks/use-prestations"

type ItemForm = { nom: string; description: string }

interface PrestationForm {
	id?: Id<"prestations">
	titre: string
	description: string
	items: ItemForm[]
}

const emptyForm: PrestationForm = { titre: "", description: "", items: [] }

export function PrestationCatalogManager() {
	const prestations = useAllPrestationsCatalog()
	const createPrestation = useCreatePrestation()
	const updatePrestation = useUpdatePrestation()
	const archivePrestation = useArchivePrestation()
	const reactivatePrestation = useReactivatePrestation()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [form, setForm] = useState<PrestationForm>(emptyForm)
	const [saving, setSaving] = useState(false)

	const handleNew = () => {
		setForm(emptyForm)
		setDialogOpen(true)
	}

	const handleEdit = (p: NonNullable<typeof prestations>[number]) => {
		setForm({
			id: p._id,
			titre: p.titre,
			description: p.description ?? "",
			items: p.items.map((i) => ({ nom: i.nom, description: i.description ?? "" })),
		})
		setDialogOpen(true)
	}

	const handleSave = async () => {
		if (!form.titre.trim()) {
			toast.error("Le titre est obligatoire")
			return
		}
		setSaving(true)
		try {
			const items = form.items
				.filter((i) => i.nom.trim())
				.map((i) => ({
					nom: i.nom.trim(),
					description: i.description.trim() || undefined,
				}))

			if (form.id) {
				await updatePrestation({
					id: form.id,
					titre: form.titre.trim(),
					description: form.description.trim() || undefined,
					items,
				})
				toast.success("Prestation mise à jour")
			} else {
				await createPrestation({
					titre: form.titre.trim(),
					description: form.description.trim() || undefined,
					items,
				})
				toast.success("Prestation créée")
			}
			setDialogOpen(false)
			setForm(emptyForm)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setSaving(false)
		}
	}

	const handleArchive = async (id: Id<"prestations">) => {
		try {
			await archivePrestation(id)
			toast.success("Prestation archivée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	const handleReactivate = async (id: Id<"prestations">) => {
		try {
			await reactivatePrestation(id)
			toast.success("Prestation réactivée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	const addItem = () => {
		setForm({ ...form, items: [...form.items, { nom: "", description: "" }] })
	}

	const updateItem = (index: number, field: keyof ItemForm, value: string) => {
		const items = [...form.items]
		items[index] = { ...items[index], [field]: value }
		setForm({ ...form, items })
	}

	const removeItem = (index: number) => {
		setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Catalogue de prestations proposées aux clients
				</p>
				<Button size="sm" className="gap-1.5" onClick={handleNew}>
					<Plus className="h-4 w-4" />
					Nouvelle prestation
				</Button>
			</div>

			{prestations === undefined ? (
				<p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
			) : prestations.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
					<Package className="h-8 w-8 mb-2 text-muted-foreground/40" />
					<p>Aucune prestation configurée</p>
					<p className="text-xs mt-1">Créez votre première prestation</p>
				</div>
			) : (
				<div className="grid gap-3 md:grid-cols-2">
					{prestations.map((p) => (
						<Card key={p._id} className={!p.isActive ? "opacity-60" : undefined}>
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-2">
										<CardTitle className="text-sm">{p.titre}</CardTitle>
										<Badge variant={p.isActive ? "default" : "secondary"} className="text-[9px]">
											{p.isActive ? "Active" : "Archivée"}
										</Badge>
									</div>
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											onClick={() => handleEdit(p)}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										{p.isActive ? (
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-amber-600"
												onClick={() => handleArchive(p._id)}
											>
												<Archive className="h-3.5 w-3.5" />
											</Button>
										) : (
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-emerald-600"
												onClick={() => handleReactivate(p._id)}
											>
												<RotateCcw className="h-3.5 w-3.5" />
											</Button>
										)}
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{p.description && (
									<p className="text-xs text-muted-foreground mb-2">{p.description}</p>
								)}
								<div className="text-xs text-muted-foreground">
									{p.items.length} élément{p.items.length > 1 ? "s" : ""} inclus
								</div>
								{p.items.length > 0 && (
									<ul className="mt-1.5 space-y-0.5">
										{p.items.map((item, i) => (
											<li key={i} className="text-xs flex items-start gap-1.5">
												<span className="text-muted-foreground mt-0.5">•</span>
												<span>{item.nom}</span>
											</li>
										))}
									</ul>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{form.id ? "Modifier la prestation" : "Nouvelle prestation"}</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label>Titre *</Label>
							<Input
								placeholder="ex: Premium"
								value={form.titre}
								onChange={(e) => setForm({ ...form, titre: e.target.value })}
							/>
						</div>

						<div className="space-y-1.5">
							<Label>Description (optionnel)</Label>
							<Textarea
								placeholder="Notre offre complète..."
								rows={2}
								value={form.description}
								onChange={(e) => setForm({ ...form, description: e.target.value })}
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Éléments inclus</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="gap-1 h-7 text-xs"
									onClick={addItem}
								>
									<Plus className="h-3 w-3" />
									Ajouter
								</Button>
							</div>

							{form.items.length === 0 && (
								<p className="text-xs text-muted-foreground italic py-2">
									Aucun élément — cliquez sur "Ajouter" pour commencer
								</p>
							)}

							{form.items.map((item, i) => (
								<div key={i} className="flex gap-2 items-start">
									<div className="flex-1 space-y-1">
										<Input
											placeholder="Nom de l'élément"
											value={item.nom}
											onChange={(e) => updateItem(i, "nom", e.target.value)}
										/>
										<Input
											placeholder="Description (optionnel)"
											value={item.description}
											onChange={(e) => updateItem(i, "description", e.target.value)}
											className="text-xs h-8"
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8 shrink-0 text-destructive"
										onClick={() => removeItem(i)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}
						</div>

						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setDialogOpen(false)}>
								Annuler
							</Button>
							<Button onClick={handleSave} disabled={saving}>
								{saving ? "Enregistrement..." : form.id ? "Enregistrer" : "Créer"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
