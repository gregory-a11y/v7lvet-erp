"use client"

import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { Id } from "@/convex/_generated/dataModel"
import { useCreateTodo, useRemoveTodo, useUpdateTodoStatut } from "@/lib/hooks/use-todos"

type Subtask = {
	_id: Id<"todos">
	titre: string
	statut: "a_faire" | "en_cours" | "termine" | "archive"
	order: number
}

export function SubtaskList({
	parentId,
	subtasks,
	readonly,
}: {
	parentId: Id<"todos">
	subtasks: Subtask[]
	readonly?: boolean
}) {
	const [newTitle, setNewTitle] = useState("")
	const [adding, setAdding] = useState(false)
	const createTodo = useCreateTodo()
	const updateStatut = useUpdateTodoStatut()
	const removeTodo = useRemoveTodo()

	async function handleAdd() {
		if (!newTitle.trim()) return
		setAdding(true)
		try {
			await createTodo({ titre: newTitle.trim(), parentId })
			setNewTitle("")
		} catch {
			toast.error("Erreur lors de l'ajout")
		} finally {
			setAdding(false)
		}
	}

	async function handleToggle(sub: Subtask) {
		try {
			await updateStatut({
				id: sub._id,
				statut: sub.statut === "termine" ? "a_faire" : "termine",
			})
		} catch {
			toast.error("Erreur")
		}
	}

	async function handleDelete(id: Id<"todos">) {
		try {
			await removeTodo(id)
		} catch {
			toast.error("Erreur")
		}
	}

	return (
		<div className="space-y-2">
			{subtasks.map((sub) => (
				<div key={sub._id} className="flex items-center gap-2 group">
					<Checkbox
						checked={sub.statut === "termine"}
						onCheckedChange={() => handleToggle(sub)}
						disabled={readonly}
					/>
					<span
						className={`flex-1 text-sm ${sub.statut === "termine" ? "line-through text-muted-foreground" : ""}`}
					>
						{sub.titre}
					</span>
					{!readonly && (
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
							onClick={() => handleDelete(sub._id)}
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					)}
				</div>
			))}

			{!readonly && (
				<div className="flex gap-2">
					<Input
						placeholder="Ajouter une sous-tâche..."
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						className="h-8 text-sm"
						onKeyDown={(e) => e.key === "Enter" && handleAdd()}
					/>
					<Button
						variant="outline"
						size="sm"
						className="h-8 shrink-0"
						onClick={handleAdd}
						disabled={adding || !newTitle.trim()}
					>
						<Plus className="h-3 w-3" />
					</Button>
				</div>
			)}
		</div>
	)
}
