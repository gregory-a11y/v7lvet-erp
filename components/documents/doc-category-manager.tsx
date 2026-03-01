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

interface DocCategoryManagerProps {
	value?: Id<"documentCategories">
	onChange: (id: Id<"documentCategories"> | undefined) => void
	canCreate?: boolean
}

export function DocCategoryManager({ value, onChange, canCreate = true }: DocCategoryManagerProps) {
	const categories = useQuery(api.documents.listCategories)
	const createCategory = useMutation(api.documents.createCategory)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [newNom, setNewNom] = useState("")
	const [creating, setCreating] = useState(false)

	async function handleCreate() {
		if (!newNom.trim()) return
		setCreating(true)
		try {
			const id = await createCategory({ nom: newNom.trim() })
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
			<Select
				value={value ?? "none"}
				onValueChange={(val) =>
					onChange(val === "none" ? undefined : (val as Id<"documentCategories">))
				}
			>
				<SelectTrigger className="flex-1">
					<SelectValue placeholder="Sans catégorie" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">Sans catégorie</SelectItem>
					{categories?.map((cat) => (
						<SelectItem key={cat._id} value={cat._id}>
							{cat.nom}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{canCreate && (
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={() => setDialogOpen(true)}
					title="Nouvelle catégorie"
				>
					<Plus className="h-4 w-4" />
				</Button>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Nouvelle catégorie</DialogTitle>
					</DialogHeader>
					<div>
						<Label>Nom</Label>
						<Input
							value={newNom}
							onChange={(e) => setNewNom(e.target.value)}
							placeholder="Ex : Comptabilité"
						/>
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
