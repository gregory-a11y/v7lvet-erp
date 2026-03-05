"use client"

import { useMutation } from "convex/react"
import { Check, Circle, Loader2, Trash2, User } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
	useDeleteOldOnboardingTask,
	useOldOnboardingTasks,
	useOnboardingTodos,
} from "@/lib/hooks/use-onboarding"

const STATUT_CONFIG = {
	a_faire: { label: "À faire", icon: Circle, color: "text-gray-500" },
	en_cours: { label: "En cours", icon: Loader2, color: "text-blue-500" },
	termine: { label: "Terminé", icon: Check, color: "text-green-500" },
}

interface OnboardingChecklistProps {
	leadId: Id<"leads">
	teamMembers?: Array<{ userId: string; nom?: string }>
}

export function OnboardingChecklist({ leadId, teamMembers }: OnboardingChecklistProps) {
	const todos = useOnboardingTodos(leadId)
	const oldTasks = useOldOnboardingTasks(leadId)
	const updateStatut = useMutation(api.todos.updateStatut)
	const updateTodo = useMutation(api.todos.update)
	const removeTodo = useMutation(api.todos.remove)
	const deleteOldTask = useDeleteOldOnboardingTask()

	const hasOldTasks = oldTasks && oldTasks.length > 0
	const hasTodos = todos && todos.length > 0

	if (!hasTodos && !hasOldTasks) return null

	const completed = todos?.filter((t) => t.statut === "termine").length ?? 0
	const total = todos?.length ?? 0
	const progress = total > 0 ? Math.round((completed / total) * 100) : 0

	const handleToggle = async (todoId: Id<"todos">, currentStatut: string) => {
		const newStatut = currentStatut === "termine" ? "a_faire" : "termine"
		try {
			await updateStatut({ id: todoId, statut: newStatut })
		} catch (err: unknown) {
			toast.error((err as Error).message)
		}
	}

	const handleAssign = async (todoId: Id<"todos">, assigneId: string) => {
		try {
			await updateTodo({
				id: todoId,
				assigneId: assigneId === "none" ? undefined : assigneId,
			})
		} catch (err: unknown) {
			toast.error((err as Error).message)
		}
	}

	const handleRemoveTodo = async (todoId: Id<"todos">) => {
		try {
			await removeTodo({ id: todoId })
			toast.success("Tâche supprimée")
		} catch (err: unknown) {
			toast.error((err as Error).message)
		}
	}

	const handleDeleteOldTask = async (taskId: Id<"onboardingTasks">) => {
		try {
			await deleteOldTask(taskId)
			toast.success("Ancienne tâche supprimée")
		} catch (err: unknown) {
			toast.error((err as Error).message)
		}
	}

	return (
		<div className="space-y-4">
			{/* New onboarding todos */}
			{hasTodos && (
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm">Onboarding</CardTitle>
							<Badge variant="secondary" className="text-[10px]">
								{completed}/{total} — {progress}%
							</Badge>
						</div>
						<div className="h-1.5 w-full rounded-full bg-muted mt-2">
							<div
								className="h-full rounded-full bg-v7-emeraude transition-all"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</CardHeader>
					<CardContent className="space-y-1">
						{todos!.map((todo) => {
							const config =
								STATUT_CONFIG[todo.statut as keyof typeof STATUT_CONFIG] ?? STATUT_CONFIG.a_faire
							const Icon = config.icon
							return (
								<div
									key={todo._id}
									className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/40 transition-colors"
								>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0"
										onClick={() => handleToggle(todo._id, todo.statut)}
									>
										<Icon className={`h-4 w-4 ${config.color}`} />
									</Button>
									<div className="flex-1 min-w-0">
										<p
											className={`text-sm ${
												todo.statut === "termine" ? "line-through text-muted-foreground" : ""
											}`}
										>
											{todo.titre}
										</p>
										{todo.description && (
											<p className="text-[11px] text-muted-foreground truncate">
												{todo.description}
											</p>
										)}
									</div>
									{/* Assign */}
									<Select
										value={todo.assigneId ?? "none"}
										onValueChange={(v) => handleAssign(todo._id, v)}
									>
										<SelectTrigger className="h-6 w-[100px] text-[10px] border-none bg-transparent">
											<User className="h-3 w-3 mr-1" />
											<SelectValue placeholder="—" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Non assigné</SelectItem>
											{teamMembers?.map((m) => (
												<SelectItem key={m.userId} value={m.userId}>
													{m.nom?.split(" ")[0] ?? m.userId}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{/* Delete */}
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
										onClick={() => handleRemoveTodo(todo._id)}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
							)
						})}
					</CardContent>
				</Card>
			)}

			{/* Legacy onboarding tasks (cleanup) */}
			{hasOldTasks && (
				<Card className="border-dashed border-orange-300">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-orange-600">
							Anciennes tâches d&apos;onboarding (legacy)
						</CardTitle>
						<p className="text-[11px] text-muted-foreground">
							Ces tâches proviennent de l&apos;ancien système. Vous pouvez les supprimer.
						</p>
					</CardHeader>
					<CardContent className="space-y-1">
						{oldTasks!.map((task) => (
							<div
								key={task._id}
								className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/40 transition-colors"
							>
								<div className="flex-1 min-w-0">
									<p className="text-sm text-muted-foreground">{task.nom}</p>
								</div>
								<Badge variant="outline" className="text-[10px]">
									{task.statut}
								</Badge>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
									onClick={() => handleDeleteOldTask(task._id)}
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
