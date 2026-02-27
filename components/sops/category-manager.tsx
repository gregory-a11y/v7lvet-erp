"use client"

import { useMutation, useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface CategoryManagerProps {
	value?: Id<"sopCategories">
	onChange: (id: Id<"sopCategories">) => void
}

function slugify(str: string): string {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
}

export function CategoryManager({ value, onChange }: CategoryManagerProps) {
	const categories = useQuery(api.sopCategories.list)
	const createCategory = useMutation(api.sopCategories.create)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [newNom, setNewNom] = useState("")
	const [newColor, setNewColor] = useState("#2E6965")
	const [creating, setCreating] = useState(false)

	async function handleCreate() {
		if (!newNom.trim()) return
		setCreating(true)
		try {
			const id = await createCategory({
				nom: newNom.trim(),
				slug: slugify(newNom.trim()),
				color: newColor,
			})
			onChange(id)
			setDialogOpen(false)
			setNewNom("")
			toast.success("Catégorie créée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setCreating(false)
		}
	}

	return (
		<div className="flex gap-2">
			<Select value={value ?? ""} onValueChange={(val) => onChange(val as Id<"sopCategories">)}>
				<SelectTrigger className="flex-1">
					<SelectValue placeholder="Sélectionner une catégorie" />
				</SelectTrigger>
				<SelectContent>
					{categories?.map((cat) => (
						<SelectItem key={cat._id} value={cat._id}>
							<div className="flex items-center gap-2">
								{cat.color && (
									<span
										className="inline-block h-3 w-3 rounded-full shrink-0"
										style={{ backgroundColor: cat.color }}
									/>
								)}
								{cat.nom}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button
				type="button"
				variant="outline"
				size="icon"
				onClick={() => setDialogOpen(true)}
				title="Nouvelle catégorie"
			>
				<Plus className="h-4 w-4" />
			</Button>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Nouvelle catégorie</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Nom</Label>
							<Input
								value={newNom}
								onChange={(e) => setNewNom(e.target.value)}
								placeholder="Ex : Audit"
							/>
						</div>
						<div>
							<Label>Couleur</Label>
							<div className="flex gap-2 items-center">
								<input
									type="color"
									value={newColor}
									onChange={(e) => setNewColor(e.target.value)}
									className="h-9 w-12 rounded border cursor-pointer"
								/>
								<span className="text-sm text-muted-foreground">{newColor}</span>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Annuler
						</Button>
						<Button onClick={handleCreate} disabled={creating || !newNom.trim()}>
							{creating ? "Création…" : "Créer"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
