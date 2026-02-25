"use client"

import { useMutation, useQuery } from "convex/react"
import { CalendarDays, ListTodo } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

const _STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-100 text-gray-800",
	en_cours: "bg-emerald-100 text-emerald-800",
	en_attente: "bg-amber-100 text-amber-800",
	termine: "bg-green-100 text-green-800",
}

const TYPE_COLORS: Record<string, string> = {
	fiscale: "bg-blue-100 text-blue-800",
	operationnelle: "bg-purple-100 text-purple-800",
}

function formatDate(ts: number | undefined): string {
	if (!ts) return "—"
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

function isOverdue(dateEcheance: number | undefined, status: string): boolean {
	if (!dateEcheance || status === "termine") return false
	return dateEcheance < Date.now()
}

export default function TachesPage() {
	const router = useRouter()
	const [statusFilter, setStatusFilter] = useState<string>("all")
	const [typeFilter, setTypeFilter] = useState<string>("all")
	const [assigneFilter, setAssigneFilter] = useState<string>("all")
	const { members, getMemberName } = useTeamMembers()

	const taches = useQuery(api.taches.list, {
		status: statusFilter === "all" ? undefined : statusFilter,
		type: typeFilter === "all" ? undefined : typeFilter,
		assigneId:
			assigneFilter === "all" || assigneFilter === "unassigned" ? undefined : assigneFilter,
	})
	const stats = useQuery(api.taches.stats)
	const updateTaskStatus = useMutation(api.taches.updateStatus)

	async function handleStatusChange(taskId: string, newStatus: string) {
		try {
			await updateTaskStatus({ id: taskId as Id<"taches">, status: newStatus })
		} catch {
			toast.error("Erreur")
		}
	}

	return (
		<div>
			<PageHeader
				title="Tâches"
				description="Obligations fiscales et tâches opérationnelles"
				actions={
					<Button variant="outline" size="sm" onClick={() => router.push("/taches/gantt")}>
						<CalendarDays className="mr-2 h-4 w-4" />
						Vue Gantt
					</Button>
				}
			/>

			{/* Stats cards */}
			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-6 gap-3 px-6 py-4">
					<div className="rounded-md border p-3 text-center">
						<div className="text-2xl font-bold">{stats.total}</div>
						<div className="text-xs text-muted-foreground">Total</div>
					</div>
					<div className="rounded-md border p-3 text-center">
						<div className="text-2xl font-bold text-gray-600">{stats.aVenir}</div>
						<div className="text-xs text-muted-foreground">À venir</div>
					</div>
					<div className="rounded-md border p-3 text-center">
						<div className="text-2xl font-bold text-emerald-600">{stats.enCours}</div>
						<div className="text-xs text-muted-foreground">En cours</div>
					</div>
					<div className="rounded-md border p-3 text-center">
						<div className="text-2xl font-bold text-amber-600">{stats.enAttente}</div>
						<div className="text-xs text-muted-foreground">En attente</div>
					</div>
					<div className="rounded-md border p-3 text-center">
						<div className="text-2xl font-bold text-green-600">{stats.termine}</div>
						<div className="text-xs text-muted-foreground">Terminé</div>
					</div>
					<div className="rounded-md border p-3 text-center border-red-200 bg-red-50">
						<div className="text-2xl font-bold text-red-600">{stats.enRetard}</div>
						<div className="text-xs text-muted-foreground">En retard</div>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3 px-6 py-2">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous les status</SelectItem>
						<SelectItem value="a_venir">À venir</SelectItem>
						<SelectItem value="en_cours">En cours</SelectItem>
						<SelectItem value="en_attente">En attente</SelectItem>
						<SelectItem value="termine">Terminé</SelectItem>
					</SelectContent>
				</Select>
				<Select value={typeFilter} onValueChange={setTypeFilter}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous les types</SelectItem>
						<SelectItem value="fiscale">Fiscale</SelectItem>
						<SelectItem value="operationnelle">Opérationnelle</SelectItem>
					</SelectContent>
				</Select>
				<Select value={assigneFilter} onValueChange={setAssigneFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Tous les assignés" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous les assignés</SelectItem>
						<SelectItem value="unassigned">Non assigné</SelectItem>
						{members?.map((m) => (
							<SelectItem key={m.userId} value={m.userId}>
								{m.nom ?? m.userId}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="px-6 pt-2">
				{taches === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 10 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : taches.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<ListTodo className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">Aucune tâche</p>
						<p className="text-sm text-muted-foreground mt-1">
							Les tâches sont générées automatiquement lors de la création d'un run.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Tâche</TableHead>
									<TableHead className="hidden md:table-cell">Client</TableHead>
									<TableHead className="hidden md:table-cell">Type</TableHead>
									<TableHead className="hidden lg:table-cell">Assigné</TableHead>
									<TableHead>Échéance</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{taches.map((tache) => {
									const overdue = isOverdue(tache.dateEcheance, tache.status)

									return (
										<TableRow
											key={tache._id}
											className="cursor-pointer"
											onClick={() => router.push(`/taches/${tache._id}`)}
										>
											<TableCell>
												<div className="flex items-center gap-2">
													<span className="font-medium">{tache.nom}</span>
													{overdue && (
														<Badge variant="destructive" className="text-xs">
															En retard
														</Badge>
													)}
												</div>
											</TableCell>
											<TableCell className="hidden md:table-cell text-muted-foreground">
												{tache.clientName}
											</TableCell>
											<TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
												{getMemberName(tache.assigneId)}
											</TableCell>
											<TableCell className="hidden md:table-cell">
												<Badge variant="secondary" className={TYPE_COLORS[tache.type] ?? ""}>
													{tache.type === "fiscale" ? "Fiscale" : "Opérationnelle"}
												</Badge>
											</TableCell>
											<TableCell className={overdue ? "text-red-600 font-medium" : ""}>
												{formatDate(tache.dateEcheance)}
											</TableCell>
											<TableCell>
												<Select
													value={tache.status}
													onValueChange={(v) => handleStatusChange(tache._id, v)}
												>
													<SelectTrigger className="w-32 h-8" onClick={(e) => e.stopPropagation()}>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="a_venir">À venir</SelectItem>
														<SelectItem value="en_cours">En cours</SelectItem>
														<SelectItem value="en_attente">En attente</SelectItem>
														<SelectItem value="termine">Terminé</SelectItem>
													</SelectContent>
												</Select>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</div>
	)
}
