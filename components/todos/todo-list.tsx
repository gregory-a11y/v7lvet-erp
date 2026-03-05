"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
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
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { buildLabelMap, useTodoCategories } from "@/lib/hooks/use-lead-options"
import { useTeamMembers } from "@/lib/hooks/use-team-members"
import { useRemoveTodo, useUpdateTodoStatut } from "@/lib/hooks/use-todos"
import { PriorityBadge } from "./priority-badge"

type Todo = {
	_id: Id<"todos">
	titre: string
	statut: "a_faire" | "en_cours" | "termine" | "archive"
	priorite: "basse" | "normale" | "haute" | "urgente"
	dateEcheance?: number
	assigneId?: string
	categorie?: string
	clientName?: string
	subtasks: { total: number; done: number }
}

function formatDate(ts: number | undefined): string {
	if (!ts) return "—"
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

function isOverdue(dateEcheance: number | undefined, statut: string): boolean {
	if (!dateEcheance || statut === "termine") return false
	return dateEcheance < Date.now()
}

export function TodoList({ todos }: { todos: Todo[] }) {
	const router = useRouter()
	const { role } = useCurrentUser()
	const { getMemberName } = useTeamMembers()
	const categories = useTodoCategories()
	const catLabels = buildLabelMap(categories)
	const updateStatut = useUpdateTodoStatut()
	const removeTodo = useRemoveTodo()
	const [todoToDelete, setTodoToDelete] = useState<string | null>(null)

	const canDelete = role === "admin" || role === "manager"

	async function handleToggle(todo: Todo, e: React.MouseEvent) {
		e.stopPropagation()
		try {
			await updateStatut({
				id: todo._id,
				statut: todo.statut === "termine" ? "a_faire" : "termine",
			})
		} catch {
			toast.error("Erreur")
		}
	}

	async function handleDelete() {
		if (!todoToDelete) return
		try {
			await removeTodo(todoToDelete as Id<"todos">)
			toast.success("Tâche supprimée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setTodoToDelete(null)
		}
	}

	return (
		<>
			<div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
				<Table>
					<TableHeader>
						<TableRow className="border-b-2 border-[#2E6965]/10">
							<TableHead className="w-10" />
							<TableHead className="text-xs font-semibold uppercase tracking-wider text-[#063238]">
								Tâche
							</TableHead>
							<TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-[#063238]">
								Priorité
							</TableHead>
							<TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-[#063238]">
								Assigné
							</TableHead>
							<TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wider text-[#063238]">
								Client
							</TableHead>
							<TableHead className="text-xs font-semibold uppercase tracking-wider text-[#063238]">
								Échéance
							</TableHead>
							{canDelete && <TableHead className="w-10" />}
						</TableRow>
					</TableHeader>
					<TableBody>
						{todos.map((todo) => {
							const overdue = isOverdue(todo.dateEcheance, todo.statut)

							return (
								<TableRow
									key={todo._id}
									className="cursor-pointer hover:bg-[#2E6965]/[0.03] transition-colors"
									onClick={() => router.push(`/taches/${todo._id}`)}
								>
									<TableCell className="pr-0">
										<Checkbox
											checked={todo.statut === "termine"}
											onCheckedChange={() => {}}
											onClick={(e) => handleToggle(todo, e as unknown as React.MouseEvent)}
											className="data-[state=checked]:bg-[#2E6965] data-[state=checked]:border-[#2E6965]"
										/>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<span
												className={`font-medium ${todo.statut === "termine" ? "line-through text-muted-foreground" : ""}`}
											>
												{todo.titre}
											</span>
											{todo.statut === "en_cours" && (
												<Badge
													variant="secondary"
													className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200"
												>
													En cours
												</Badge>
											)}
											{overdue && (
												<Badge variant="destructive" className="text-[10px] px-1.5 py-0">
													En retard
												</Badge>
											)}
											{todo.subtasks.total > 0 && (
												<span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
													{todo.subtasks.done}/{todo.subtasks.total}
												</span>
											)}
										</div>
										{todo.categorie && (
											<span className="text-[10px] text-muted-foreground mt-0.5 block">
												{catLabels[todo.categorie] ?? todo.categorie}
											</span>
										)}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<PriorityBadge priorite={todo.priorite} />
									</TableCell>
									<TableCell className="hidden md:table-cell text-sm text-muted-foreground">
										{getMemberName(todo.assigneId)}
									</TableCell>
									<TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
										{todo.clientName ?? "—"}
									</TableCell>
									<TableCell className={overdue ? "text-red-600 font-medium text-sm" : "text-sm"}>
										{formatDate(todo.dateEcheance)}
									</TableCell>
									{canDelete && (
										<TableCell>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-red-600"
												onClick={(e) => {
													e.stopPropagation()
													setTodoToDelete(todo._id)
												}}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</TableCell>
									)}
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			<AlertDialog
				open={todoToDelete !== null}
				onOpenChange={(open) => !open && setTodoToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
						<AlertDialogDescription>
							La tâche et ses sous-tâches seront définitivement supprimées.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
