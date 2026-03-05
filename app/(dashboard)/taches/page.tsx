"use client"

import { useQuery } from "convex/react"
import { AlertTriangle, CheckCircle2, Clock, Columns3, ListTodo, Plus } from "lucide-react"
import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { NewTodoDialog } from "@/components/todos/new-todo-dialog"
import { TodoFilters } from "@/components/todos/todo-filters"
import { TodoKanban } from "@/components/todos/todo-kanban"
import { TodoList } from "@/components/todos/todo-list"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { useTodoStats, useTodos } from "@/lib/hooks/use-todos"
import { cn } from "@/lib/utils"

type ViewMode = "list" | "kanban"

function StatCard({
	label,
	value,
	icon: Icon,
	color,
	borderColor,
	bgTint,
}: {
	label: string
	value: number
	icon: React.ElementType
	color: string
	borderColor: string
	bgTint: string
}) {
	return (
		<div
			className={cn(
				"rounded-xl bg-white shadow-sm border-l-4 p-4 flex items-center gap-3",
				borderColor,
			)}
		>
			<div
				className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
				style={{ backgroundColor: bgTint }}
			>
				<Icon className="h-5 w-5" style={{ color }} />
			</div>
			<div>
				<div className="text-2xl font-bold tracking-tight" style={{ color }}>
					{value}
				</div>
				<div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					{label}
				</div>
			</div>
		</div>
	)
}

export default function TachesPage() {
	const [filters, setFilters] = useState({
		statut: "all",
		priorite: "all",
		assigneId: "all",
		categorie: "all",
		search: "",
	})
	const [dialogOpen, setDialogOpen] = useState(false)
	const [view, setView] = useState<ViewMode>("list")

	const todos = useTodos({
		statut: filters.statut === "all" ? undefined : (filters.statut as any),
		priorite: filters.priorite === "all" ? undefined : (filters.priorite as any),
		assigneId:
			filters.assigneId === "all" || filters.assigneId === "unassigned"
				? undefined
				: filters.assigneId,
		categorie: filters.categorie === "all" ? undefined : filters.categorie,
		search: filters.search || undefined,
	})
	const stats = useTodoStats()
	const clients = useQuery(api.clients.list, {})

	return (
		<div>
			<PageHeader
				title="Tâches"
				description="Todo list de l'équipe"
				actions={
					<div className="flex items-center gap-2">
						{/* View toggle */}
						<div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
							<button
								type="button"
								onClick={() => setView("list")}
								className={cn(
									"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
									view === "list"
										? "bg-white shadow-sm text-[#063238]"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<ListTodo className="h-3.5 w-3.5" />
								Liste
							</button>
							<button
								type="button"
								onClick={() => setView("kanban")}
								className={cn(
									"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
									view === "kanban"
										? "bg-white shadow-sm text-[#063238]"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<Columns3 className="h-3.5 w-3.5" />
								Kanban
							</button>
						</div>

						<Button
							size="sm"
							onClick={() => setDialogOpen(true)}
							className="bg-[#2E6965] hover:bg-[#245552]"
						>
							<Plus className="mr-2 h-4 w-4" />
							Nouvelle tâche
						</Button>
					</div>
				}
			/>

			{/* Stats cards — branded */}
			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4">
					<StatCard
						label="À faire"
						value={stats.aFaire}
						icon={Clock}
						color="#94a3b8"
						borderColor="border-l-slate-400"
						bgTint="#94a3b810"
					/>
					<StatCard
						label="En cours"
						value={stats.enCours}
						icon={ListTodo}
						color="#3b82f6"
						borderColor="border-l-blue-500"
						bgTint="#3b82f610"
					/>
					<StatCard
						label="Terminé"
						value={stats.termine}
						icon={CheckCircle2}
						color="#2E6965"
						borderColor="border-l-[#2E6965]"
						bgTint="#2E696510"
					/>
					<StatCard
						label="En retard"
						value={stats.enRetard}
						icon={AlertTriangle}
						color="#ef4444"
						borderColor="border-l-red-500"
						bgTint="#ef444410"
					/>
				</div>
			)}

			{/* Filters */}
			<div className="px-6 py-2">
				<TodoFilters filters={filters} onChange={setFilters} />
			</div>

			{/* Content */}
			<div className="px-6 pt-2 pb-6">
				{todos === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full rounded-lg" />
						))}
					</div>
				) : todos.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2E6965]/10 mb-4">
							<ListTodo className="h-8 w-8 text-[#2E6965]" />
						</div>
						<p className="text-lg font-semibold text-[#063238]">Aucune tâche</p>
						<p className="text-sm text-muted-foreground mt-1">
							Créez votre première tâche pour commencer.
						</p>
						<Button
							className="mt-4 bg-[#2E6965] hover:bg-[#245552]"
							onClick={() => setDialogOpen(true)}
						>
							<Plus className="mr-2 h-4 w-4" />
							Nouvelle tâche
						</Button>
					</div>
				) : view === "kanban" ? (
					<TodoKanban todos={todos} />
				) : (
					<TodoList todos={todos} />
				)}
			</div>

			<NewTodoDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				clients={clients?.map((c) => ({ _id: c._id, raisonSociale: c.raisonSociale }))}
			/>
		</div>
	)
}
