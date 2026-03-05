"use client"

import { useMutation } from "convex/react"
import {
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Circle,
	Clock,
	Loader2,
	Search,
	Trash2,
	User,
	Users,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
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
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
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
import { useOnboardingOverview } from "@/lib/hooks/use-onboarding"
import { cn } from "@/lib/utils"

const STATUT_CONFIG = {
	a_faire: { label: "À faire", icon: Circle, color: "text-gray-500" },
	en_cours: { label: "En cours", icon: Loader2, color: "text-blue-500" },
	termine: { label: "Terminé", icon: Check, color: "text-green-500" },
} as const

function StatCard({
	label,
	value,
	icon: Icon,
	color,
	borderColor,
	bgTint,
}: {
	label: string
	value: number | string
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

export default function OnboardingPage() {
	const overview = useOnboardingOverview()
	const [expandedLead, setExpandedLead] = useState<string | null>(null)
	const [search, setSearch] = useState("")
	const [filterStatut, setFilterStatut] = useState("all")
	const [filterProgress, setFilterProgress] = useState("all")
	const [deleteTarget, setDeleteTarget] = useState<{
		leadId: Id<"leads">
		name: string
	} | null>(null)

	const updateStatut = useMutation(api.todos.updateStatut)
	const removeOnboarding = useMutation(api.todos.removeOnboardingForLead)

	// Filtered data
	const filtered = useMemo(() => {
		if (!overview) return undefined
		let data = overview

		// Search
		if (search.trim()) {
			const q = search.toLowerCase()
			data = data.filter(
				(item) =>
					item.leadNom.toLowerCase().includes(q) ||
					item.leadPrenom?.toLowerCase().includes(q) ||
					item.entreprise?.toLowerCase().includes(q) ||
					item.clientNom?.toLowerCase().includes(q) ||
					item.responsableNom?.toLowerCase().includes(q),
			)
		}

		// Statut filter
		if (filterStatut !== "all") {
			data = data.filter((item) => item.statut === filterStatut)
		}

		// Progress filter
		if (filterProgress === "complete") {
			data = data.filter((item) => item.progress === 100)
		} else if (filterProgress === "in_progress") {
			data = data.filter((item) => item.progress > 0 && item.progress < 100)
		} else if (filterProgress === "not_started") {
			data = data.filter((item) => item.progress === 0)
		}

		return data
	}, [overview, search, filterStatut, filterProgress])

	const handleToggle = async (todoId: Id<"todos">, currentStatut: string) => {
		const newStatut = currentStatut === "termine" ? "a_faire" : "termine"
		try {
			await updateStatut({ id: todoId, statut: newStatut })
		} catch (err: unknown) {
			toast.error((err as Error).message)
		}
	}

	const handleDeleteOnboarding = async () => {
		if (!deleteTarget) return
		try {
			const result = await removeOnboarding({ leadId: deleteTarget.leadId })
			toast.success(`${result.deleted} tâche(s) d'onboarding supprimée(s)`)
			setDeleteTarget(null)
		} catch (err: unknown) {
			toast.error((err as Error).message)
		}
	}

	// Stats
	const totalLeads = overview?.length ?? 0
	const totalTasks = overview?.reduce((s, o) => s + o.total, 0) ?? 0
	const totalDone = overview?.reduce((s, o) => s + o.done, 0) ?? 0
	const totalComplete = overview?.filter((o) => o.progress === 100).length ?? 0

	return (
		<div>
			<PageHeader title="Onboarding" description="Suivi de l'onboarding des leads validés" />

			{/* Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4">
				<StatCard
					label="En cours"
					value={totalLeads}
					icon={Users}
					color="#3b82f6"
					borderColor="border-l-blue-500"
					bgTint="#3b82f610"
				/>
				<StatCard
					label="Tâches"
					value={`${totalDone}/${totalTasks}`}
					icon={Clock}
					color="#94a3b8"
					borderColor="border-l-slate-400"
					bgTint="#94a3b810"
				/>
				<StatCard
					label="Terminés"
					value={totalComplete}
					icon={CheckCircle2}
					color="#2E6965"
					borderColor="border-l-[#2E6965]"
					bgTint="#2E696510"
				/>
				<StatCard
					label="Progression"
					value={totalTasks > 0 ? `${Math.round((totalDone / totalTasks) * 100)}%` : "—"}
					icon={Check}
					color="#6242FB"
					borderColor="border-l-[#6242FB]"
					bgTint="#6242FB10"
				/>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-3 px-6 pb-4">
				<div className="relative flex-1 max-w-xs">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Rechercher un lead, client…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9 h-9 text-sm"
					/>
				</div>
				<Select value={filterStatut} onValueChange={setFilterStatut}>
					<SelectTrigger className="w-[140px] h-9 text-sm">
						<SelectValue placeholder="Statut" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous statuts</SelectItem>
						<SelectItem value="valide">Validé</SelectItem>
						<SelectItem value="onboarding">Onboarding</SelectItem>
					</SelectContent>
				</Select>
				<Select value={filterProgress} onValueChange={setFilterProgress}>
					<SelectTrigger className="w-[160px] h-9 text-sm">
						<SelectValue placeholder="Progression" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Toute progression</SelectItem>
						<SelectItem value="not_started">Non démarré</SelectItem>
						<SelectItem value="in_progress">En cours</SelectItem>
						<SelectItem value="complete">Terminé (100%)</SelectItem>
					</SelectContent>
				</Select>
				{(search || filterStatut !== "all" || filterProgress !== "all") && (
					<Button
						variant="ghost"
						size="sm"
						className="text-xs text-muted-foreground"
						onClick={() => {
							setSearch("")
							setFilterStatut("all")
							setFilterProgress("all")
						}}
					>
						Réinitialiser
					</Button>
				)}
			</div>

			{/* Table */}
			<div className="px-6 pb-6">
				<div className="rounded-xl border bg-white shadow-sm overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/30">
								<TableHead className="w-8" />
								<TableHead>Lead / Client</TableHead>
								<TableHead>Responsable</TableHead>
								<TableHead>Statut</TableHead>
								<TableHead className="w-[200px]">Progression</TableHead>
								<TableHead className="w-10" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{!filtered && (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-12">
										<Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
									</TableCell>
								</TableRow>
							)}
							{filtered?.length === 0 && (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
										Aucun lead en onboarding
									</TableCell>
								</TableRow>
							)}
							{filtered?.map((item) => {
								const isExpanded = expandedLead === item.leadId
								const displayName =
									item.clientNom ??
									item.entreprise ??
									`${item.leadPrenom ?? ""} ${item.leadNom}`.trim()
								return (
									<>
										<TableRow
											key={item.leadId}
											className="cursor-pointer hover:bg-muted/40 transition-colors"
											onClick={() => setExpandedLead(isExpanded ? null : item.leadId)}
										>
											<TableCell className="pl-4">
												{isExpanded ? (
													<ChevronDown className="h-4 w-4 text-muted-foreground" />
												) : (
													<ChevronRight className="h-4 w-4 text-muted-foreground" />
												)}
											</TableCell>
											<TableCell>
												<div>
													<p className="font-medium text-sm">{displayName}</p>
													{item.clientNom && (
														<p className="text-[11px] text-muted-foreground">
															{item.leadPrenom} {item.leadNom}
														</p>
													)}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1.5">
													<User className="h-3.5 w-3.5 text-muted-foreground" />
													<span className="text-sm">{item.responsableNom ?? "—"}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] capitalize",
														item.statut === "valide" &&
															"border-emerald-300 text-emerald-700 bg-emerald-50",
														item.statut === "onboarding" &&
															"border-blue-300 text-blue-700 bg-blue-50",
													)}
												>
													{item.statut.replace("_", " ")}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<div className="h-2 flex-1 rounded-full bg-muted">
														<div
															className={cn(
																"h-full rounded-full transition-all",
																item.progress === 100
																	? "bg-[#2E6965]"
																	: item.progress > 0
																		? "bg-blue-500"
																		: "bg-gray-300",
															)}
															style={{
																width: `${Math.max(item.progress, 2)}%`,
															}}
														/>
													</div>
													<span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
														{item.done}/{item.total}
													</span>
												</div>
											</TableCell>
											<TableCell className="pr-4">
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-muted-foreground hover:text-destructive"
													onClick={(e) => {
														e.stopPropagation()
														setDeleteTarget({
															leadId: item.leadId,
															name: displayName,
														})
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</TableCell>
										</TableRow>
										{/* Expanded todos */}
										{isExpanded &&
											item.todos.map((todo) => {
												const config =
													STATUT_CONFIG[todo.statut as keyof typeof STATUT_CONFIG] ??
													STATUT_CONFIG.a_faire
												const Icon = config.icon
												return (
													<TableRow
														key={todo._id}
														className="bg-muted/20 border-l-2 border-l-[#2E6965]/20"
													>
														<TableCell />
														<TableCell colSpan={3}>
															<div className="flex items-center gap-2 pl-4">
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-6 w-6 shrink-0"
																	onClick={(e) => {
																		e.stopPropagation()
																		handleToggle(todo._id, todo.statut)
																	}}
																>
																	<Icon className={`h-4 w-4 ${config.color}`} />
																</Button>
																<span
																	className={cn(
																		"text-sm",
																		todo.statut === "termine" &&
																			"line-through text-muted-foreground",
																	)}
																>
																	{todo.titre}
																</span>
															</div>
														</TableCell>
														<TableCell>
															<Badge variant="outline" className="text-[10px]">
																{config.label}
															</Badge>
														</TableCell>
														<TableCell />
													</TableRow>
												)
											})}
									</>
								)
							})}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Delete confirmation dialog */}
			<AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer l&apos;onboarding</AlertDialogTitle>
						<AlertDialogDescription>
							Toutes les tâches d&apos;onboarding de <strong>{deleteTarget?.name}</strong> seront
							supprimées. Cette action est irréversible.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteOnboarding}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
