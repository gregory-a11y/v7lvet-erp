"use client"

import { MessageSquare, SubtitlesIcon } from "lucide-react"
import { toast } from "sonner"
import { SopPicker } from "@/components/shared/sop-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { Id } from "@/convex/_generated/dataModel"
import { useTodoCategories } from "@/lib/hooks/use-lead-options"
import { useTeamMembers } from "@/lib/hooks/use-team-members"
import { useUpdateTodo, useUpdateTodoStatut } from "@/lib/hooks/use-todos"
import { PriorityBadge } from "./priority-badge"
import { SubtaskList } from "./subtask-list"
import { TodoComments } from "./todo-comments"

type TodoDetail = {
	_id: Id<"todos">
	titre: string
	description?: string
	statut: "a_faire" | "en_cours" | "termine" | "archive"
	priorite: "basse" | "normale" | "haute" | "urgente"
	dateEcheance?: number
	assigneId?: string
	categorie?: string
	clientName?: string
	clientId?: Id<"clients">
	sopIds?: Id<"sops">[]
	sopList?: { _id: Id<"sops">; nom: string }[]
	tags?: string[]
	completedAt?: number
	createdAt: number
	subtasks: {
		_id: Id<"todos">
		titre: string
		statut: "a_faire" | "en_cours" | "termine" | "archive"
		order: number
	}[]
}

function formatDate(ts: number | undefined): string {
	if (!ts) return "—"
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	})
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
	if (!value) return null
	return (
		<div className="flex justify-between py-1.5">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	)
}

export function TodoDetailCard({ todo }: { todo: TodoDetail }) {
	const { members } = useTeamMembers()
	const categories = useTodoCategories()
	const updateTodo = useUpdateTodo()
	const updateStatut = useUpdateTodoStatut()

	const isOverdue = todo.dateEcheance && todo.dateEcheance < Date.now() && todo.statut !== "termine"

	async function handleStatutChange(statut: string) {
		try {
			await updateStatut({
				id: todo._id,
				statut: statut as "a_faire" | "en_cours" | "termine" | "archive",
			})
			toast.success("Statut mis à jour")
		} catch {
			toast.error("Erreur")
		}
	}

	async function handleAssignChange(assigneId: string) {
		try {
			await updateTodo({
				id: todo._id,
				assigneId: assigneId === "unassigned" ? undefined : assigneId,
			})
			toast.success("Assigné mis à jour")
		} catch {
			toast.error("Erreur")
		}
	}

	async function handlePrioriteChange(priorite: string) {
		try {
			await updateTodo({ id: todo._id, priorite })
			toast.success("Priorité mise à jour")
		} catch {
			toast.error("Erreur")
		}
	}

	async function handleSopChange(sopIds: Id<"sops">[]) {
		try {
			await updateTodo({ id: todo._id, sopIds: sopIds.length > 0 ? sopIds : undefined })
			toast.success("SOPs mis à jour")
		} catch {
			toast.error("Erreur")
		}
	}

	async function handleCategorieChange(value: string) {
		try {
			await updateTodo({
				id: todo._id,
				categorie: value === "none" ? undefined : value,
			})
			toast.success("Catégorie mise à jour")
		} catch {
			toast.error("Erreur")
		}
	}

	return (
		<div className="space-y-6">
			{/* Main info */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						Détails
						{isOverdue && (
							<span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-destructive/10 text-destructive">
								En retard
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-0">
					{todo.description && (
						<div className="pb-3">
							<p className="text-sm whitespace-pre-wrap">{todo.description}</p>
						</div>
					)}

					{/* Statut */}
					<div className="flex justify-between items-center py-1.5">
						<span className="text-sm text-muted-foreground">Statut</span>
						<Select value={todo.statut} onValueChange={handleStatutChange}>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="a_faire">À faire</SelectItem>
								<SelectItem value="en_cours">En cours</SelectItem>
								<SelectItem value="termine">Terminé</SelectItem>
								<SelectItem value="archive">Archivé</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Priorité */}
					<div className="flex justify-between items-center py-1.5">
						<span className="text-sm text-muted-foreground">Priorité</span>
						<Select value={todo.priorite} onValueChange={handlePrioriteChange}>
							<SelectTrigger className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="basse">Basse</SelectItem>
								<SelectItem value="normale">Normale</SelectItem>
								<SelectItem value="haute">Haute</SelectItem>
								<SelectItem value="urgente">Urgente</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Assigné */}
					<div className="flex justify-between items-center py-1.5">
						<span className="text-sm text-muted-foreground">Assigné à</span>
						<Select value={todo.assigneId ?? "unassigned"} onValueChange={handleAssignChange}>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="Non assigné" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="unassigned">Non assigné</SelectItem>
								{members?.map((m) => (
									<SelectItem key={m.userId} value={m.userId}>
										{m.nom ?? m.userId}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Catégorie */}
					<div className="flex justify-between items-center py-1.5">
						<span className="text-sm text-muted-foreground">Catégorie</span>
						<Select value={todo.categorie ?? "none"} onValueChange={handleCategorieChange}>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="Aucune" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Aucune</SelectItem>
								{categories?.map((cat) => (
									<SelectItem key={cat._id} value={cat.value}>
										{cat.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* SOPs */}
					<div className="space-y-1.5 py-1.5">
						<span className="text-sm text-muted-foreground">SOPs</span>
						<SopPicker value={todo.sopIds ?? []} onChange={handleSopChange} size="sm" />
					</div>

					<InfoRow label="Échéance" value={formatDate(todo.dateEcheance)} />
					<InfoRow label="Client" value={todo.clientName} />
					{todo.completedAt && (
						<InfoRow label="Complétée le" value={formatDate(todo.completedAt)} />
					)}
					<InfoRow label="Créée le" value={formatDate(todo.createdAt)} />

					{todo.tags && todo.tags.length > 0 && (
						<div className="flex flex-wrap gap-1 pt-2">
							{todo.tags.map((tag) => (
								<PriorityBadge key={tag} priorite={tag} />
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Subtasks */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<SubtitlesIcon className="h-4 w-4" />
						Sous-tâches
						{todo.subtasks.length > 0 && (
							<span className="text-xs text-muted-foreground font-normal">
								({todo.subtasks.filter((s) => s.statut === "termine").length}/{todo.subtasks.length}
								)
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<SubtaskList parentId={todo._id} subtasks={todo.subtasks} />
				</CardContent>
			</Card>

			{/* Comments */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<MessageSquare className="h-4 w-4" />
						Commentaires
					</CardTitle>
				</CardHeader>
				<CardContent>
					<TodoComments todoId={todo._id} />
				</CardContent>
			</Card>
		</div>
	)
}
