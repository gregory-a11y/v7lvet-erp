"use client"

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { Calendar, CheckCircle2, Circle, Clock, User } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Badge } from "@/components/ui/badge"
import type { Id } from "@/convex/_generated/dataModel"
import { buildLabelMap, useTodoCategories } from "@/lib/hooks/use-lead-options"
import { useTeamMembers } from "@/lib/hooks/use-team-members"
import { useUpdateTodoStatut } from "@/lib/hooks/use-todos"
import { cn } from "@/lib/utils"
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

const COLUMNS = [
	{ statut: "a_faire", label: "À faire", icon: Circle, color: "#94a3b8" },
	{ statut: "en_cours", label: "En cours", icon: Clock, color: "#3b82f6" },
	{ statut: "termine", label: "Terminé", icon: CheckCircle2, color: "#2E6965" },
] as const

function formatDate(ts: number | undefined): string {
	if (!ts) return ""
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
	})
}

function isOverdue(dateEcheance: number | undefined, statut: string): boolean {
	if (!dateEcheance || statut === "termine") return false
	return dateEcheance < Date.now()
}

function TodoCard({
	todo,
	index,
	catLabels,
}: {
	todo: Todo
	index: number
	catLabels: Record<string, string>
}) {
	const { getMemberName } = useTeamMembers()
	const overdue = isOverdue(todo.dateEcheance, todo.statut)

	return (
		<Draggable draggableId={todo._id} index={index}>
			{(provided, snapshot) => {
				const card = (
					<div
						ref={provided.innerRef}
						{...provided.draggableProps}
						{...provided.dragHandleProps}
						className={cn(
							"rounded-lg border bg-white p-3 shadow-sm border-l-[3px] cursor-grab active:cursor-grabbing transition-all",
							snapshot.isDragging
								? "shadow-lg ring-2 ring-[#2E6965]/20 scale-[1.02]"
								: "hover:shadow-md hover:border-[#2E6965]/20",
						)}
						style={{
							...provided.draggableProps.style,
							borderLeftColor:
								todo.priorite === "urgente"
									? "#ef4444"
									: todo.priorite === "haute"
										? "#f59e0b"
										: todo.priorite === "normale"
											? "#3b82f6"
											: "#94a3b8",
						}}
					>
						<Link
							href={`/taches/${todo._id}`}
							onClick={(e) => {
								if (snapshot.isDragging) e.preventDefault()
							}}
							draggable={false}
							className="block"
						>
							{/* Title */}
							<p
								className={cn(
									"text-sm font-medium leading-snug",
									todo.statut === "termine" && "line-through text-muted-foreground",
								)}
							>
								{todo.titre}
							</p>

							{/* Tags row */}
							<div className="mt-2 flex flex-wrap gap-1">
								<PriorityBadge priorite={todo.priorite} />
								{todo.categorie && (
									<Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
										{catLabels[todo.categorie] ?? todo.categorie}
									</Badge>
								)}
								{overdue && (
									<Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
										En retard
									</Badge>
								)}
							</div>

							{/* Footer */}
							<div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
								<div className="flex items-center gap-2">
									{todo.dateEcheance && (
										<span
											className={cn(
												"flex items-center gap-0.5",
												overdue && "text-red-600 font-medium",
											)}
										>
											<Calendar className="h-2.5 w-2.5" />
											{formatDate(todo.dateEcheance)}
										</span>
									)}
									{todo.subtasks.total > 0 && (
										<span className="bg-muted/60 px-1.5 py-0.5 rounded-full text-[9px]">
											{todo.subtasks.done}/{todo.subtasks.total}
										</span>
									)}
								</div>
								<div className="flex items-center gap-1.5">
									{todo.clientName && (
										<span className="truncate max-w-[60px]">{todo.clientName}</span>
									)}
									{todo.assigneId && (
										<span className="flex items-center gap-0.5 truncate max-w-[60px]">
											<User className="h-2.5 w-2.5 shrink-0" />
											{getMemberName(todo.assigneId)?.split(" ")[0] ?? "—"}
										</span>
									)}
								</div>
							</div>
						</Link>
					</div>
				)

				if (snapshot.isDragging) {
					return createPortal(card, document.body)
				}
				return card
			}}
		</Draggable>
	)
}

export function TodoKanban({ todos }: { todos: Todo[] }) {
	const updateStatut = useUpdateTodoStatut()
	const categories = useTodoCategories()
	const catLabels = buildLabelMap(categories)
	const pendingMutationsRef = useRef(0)

	// Group todos by statut
	const grouped: Record<string, Todo[]> = useMemo(
		() => ({
			a_faire: todos.filter((t) => t.statut === "a_faire"),
			en_cours: todos.filter((t) => t.statut === "en_cours"),
			termine: todos.filter((t) => t.statut === "termine"),
		}),
		[todos],
	)

	const [optimisticState, setOptimisticState] = useState<Record<string, Todo[]> | null>(null)
	const groupedRef = useRef(grouped)
	groupedRef.current = grouped

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset optimistic state when server data changes
	useEffect(() => {
		if (pendingMutationsRef.current === 0) {
			setOptimisticState(null)
		}
	}, [todos])

	const handleDragEnd = useCallback(
		async (result: DropResult) => {
			const { draggableId, source, destination } = result
			if (!destination) return
			if (source.droppableId === destination.droppableId && source.index === destination.index)
				return

			const sourceStatut = source.droppableId
			const destStatut = destination.droppableId

			setOptimisticState((prev) => {
				const currentData = prev ?? groupedRef.current
				const next = { ...currentData }
				const sourceList = [...(next[sourceStatut] ?? [])]
				const destList = sourceStatut === destStatut ? sourceList : [...(next[destStatut] ?? [])]

				const [moved] = sourceList.splice(source.index, 1)
				if (!moved) return prev

				const updatedTodo = { ...moved, statut: destStatut as Todo["statut"] }
				destList.splice(destination.index, 0, updatedTodo)

				next[sourceStatut] = sourceList
				if (sourceStatut !== destStatut) {
					next[destStatut] = destList
				}
				return next
			})
			pendingMutationsRef.current++

			try {
				if (sourceStatut !== destStatut) {
					await updateStatut({
						id: draggableId as Id<"todos">,
						statut: destStatut as Todo["statut"],
					})
				}
			} finally {
				pendingMutationsRef.current--
				if (pendingMutationsRef.current === 0) {
					setOptimisticState(null)
				}
			}
		},
		[updateStatut],
	)

	const data = optimisticState ?? grouped

	return (
		<DragDropContext onDragEnd={handleDragEnd}>
			<div className="grid grid-cols-3 gap-4">
				{COLUMNS.map((col) => {
					const columnTodos = data[col.statut] ?? []
					return (
						<div key={col.statut} className="flex flex-col rounded-xl bg-muted/30 min-h-[400px]">
							{/* Column header */}
							<div
								className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40 rounded-t-xl"
								style={{ backgroundColor: `${col.color}08` }}
							>
								<div
									className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0"
									style={{ backgroundColor: `${col.color}15` }}
								>
									<col.icon className="h-3.5 w-3.5" style={{ color: col.color }} />
								</div>
								<span className="text-xs font-semibold uppercase tracking-wider text-[#063238]">
									{col.label}
								</span>
								<span
									className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shrink-0"
									style={{ backgroundColor: col.color }}
								>
									{columnTodos.length}
								</span>
							</div>

							{/* Droppable area */}
							<Droppable droppableId={col.statut}>
								{(provided, snapshot) => (
									<div
										ref={provided.innerRef}
										{...provided.droppableProps}
										className={cn(
											"flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
											snapshot.isDraggingOver && "bg-[#2E6965]/5 rounded-b-xl",
										)}
									>
										{columnTodos.map((todo, index) => (
											<TodoCard key={todo._id} todo={todo} index={index} catLabels={catLabels} />
										))}
										{provided.placeholder}
										{columnTodos.length === 0 && !snapshot.isDraggingOver && (
											<div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
												Aucune tâche
											</div>
										)}
									</div>
								)}
							</Droppable>
						</div>
					)
				})}
			</div>
		</DragDropContext>
	)
}
