"use client"

import {
	Building2,
	Calendar,
	CheckCircle2,
	Clock,
	Columns3,
	ListTodo,
	ShieldCheck,
	User,
	XCircle,
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { usePendingGates, useRejectGate, useValidateGate } from "@/lib/hooks/use-gates"
import { cn } from "@/lib/utils"

type ViewMode = "list" | "kanban"

const CATEGORIE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
	IR: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
	IS: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
	TVA: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
	TAXES: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
	AUTRE: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
}

function formatDate(ts: number | undefined): string {
	if (!ts) return "—"
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

function formatDateShort(ts: number | undefined): string {
	if (!ts) return ""
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
	})
}

function isOverdue(dateEcheance: number | undefined): boolean {
	if (!dateEcheance) return false
	return dateEcheance < Date.now()
}

type Gate = NonNullable<ReturnType<typeof usePendingGates>>[number]

// ─── Stat Card ──────────────────────────────────────────────
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

// ─── Kanban Card ────────────────────────────────────────────
function GateCard({
	gate,
	onValidate,
	onReject,
}: {
	gate: Gate
	onValidate: (id: Id<"gates">) => void
	onReject: (id: Id<"gates">) => void
}) {
	const overdue = isOverdue(gate.tacheDateEcheance)
	const catColors = gate.tacheCategorie ? CATEGORIE_COLORS[gate.tacheCategorie] : null

	return (
		<div
			className={cn(
				"rounded-lg border bg-white p-3 shadow-sm border-l-[3px] transition-all",
				"hover:shadow-md hover:border-[#2E6965]/20",
			)}
			style={{
				borderLeftColor: overdue ? "#ef4444" : "#f59e0b",
			}}
		>
			{/* Header: Task name */}
			<p className="text-sm font-medium leading-snug">{gate.tacheNom}</p>

			{/* Client */}
			<p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 truncate">
				<Building2 className="h-3 w-3 shrink-0" />
				{gate.clientName}
			</p>

			{/* Tags */}
			<div className="mt-2 flex flex-wrap gap-1">
				{gate.tacheCategorie && catColors && (
					<Badge
						variant="secondary"
						className={cn("text-[9px] px-1.5 py-0 h-4", catColors.bg, catColors.text)}
					>
						{gate.tacheCategorie}
					</Badge>
				)}
				{overdue && (
					<Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
						En retard
					</Badge>
				)}
			</div>

			{/* Footer: Assigné + Date */}
			<div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
				<div className="flex items-center gap-2">
					{gate.tacheDateEcheance && (
						<span
							className={cn("flex items-center gap-0.5", overdue && "text-red-600 font-medium")}
						>
							<Calendar className="h-2.5 w-2.5" />
							{formatDateShort(gate.tacheDateEcheance)}
						</span>
					)}
				</div>
				{gate.tacheAssigneNom && (
					<span className="flex items-center gap-0.5 truncate max-w-[80px]">
						<User className="h-2.5 w-2.5 shrink-0" />
						{gate.tacheAssigneNom.split(" ")[0]}
					</span>
				)}
			</div>

			{/* Actions */}
			<div className="mt-3 flex gap-2">
				<Button
					size="sm"
					className="flex-1 h-7 text-xs bg-[#2E6965] hover:bg-[#245552] text-white"
					onClick={() => onValidate(gate._id)}
				>
					<CheckCircle2 className="mr-1 h-3.5 w-3.5" />
					Valider
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="flex-1 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
					onClick={() => onReject(gate._id)}
				>
					<XCircle className="mr-1 h-3.5 w-3.5" />
					Rejeter
				</Button>
			</div>
		</div>
	)
}

// ─── Main Page ──────────────────────────────────────────────
export default function GatePage() {
	const { user, isAdmin } = useCurrentUser()
	const gates = usePendingGates()
	const validateGate = useValidateGate()
	const rejectGate = useRejectGate()

	const [view, setView] = useState<ViewMode>("list")
	const [validating, setValidating] = useState<Id<"gates"> | null>(null)
	const [rejecting, setRejecting] = useState<Id<"gates"> | null>(null)
	const [rejectComment, setRejectComment] = useState("")
	const [filterResponsable, setFilterResponsable] = useState("me")
	const [filterAssigne, setFilterAssigne] = useState("all")

	// Unique responsables for filter
	const responsables = useMemo(() => {
		if (!gates) return []
		const map = new Map<string, string>()
		for (const g of gates) {
			map.set(g.responsableId, g.responsableNom)
		}
		return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
	}, [gates])

	// Unique assignés for filter
	const assignes = useMemo(() => {
		if (!gates) return []
		const map = new Map<string, string>()
		for (const g of gates) {
			if (g.tacheAssigneId && g.tacheAssigneNom) {
				map.set(g.tacheAssigneId, g.tacheAssigneNom)
			}
		}
		return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
	}, [gates])

	// Filter gates
	const filteredGates = useMemo(() => {
		if (!gates) return []
		return gates.filter((g) => {
			if (filterResponsable === "me") {
				if (user?.id && g.responsableId !== user.id) return false
			} else if (filterResponsable !== "all" && g.responsableId !== filterResponsable) {
				return false
			}
			if (filterAssigne !== "all" && g.tacheAssigneId !== filterAssigne) return false
			return true
		})
	}, [gates, filterResponsable, filterAssigne, user?.id])

	// Stats
	const myGatesCount = useMemo(() => {
		if (!gates || !user?.id) return 0
		return gates.filter((g) => g.responsableId === user.id).length
	}, [gates, user?.id])

	const totalCount = gates?.length ?? 0
	const overdueCount = useMemo(() => {
		return filteredGates.filter((g) => isOverdue(g.tacheDateEcheance)).length
	}, [filteredGates])

	// Group by responsable for kanban
	const groupedByResponsable = useMemo(() => {
		const map = new Map<string, { nom: string; gates: Gate[] }>()
		for (const g of filteredGates) {
			const existing = map.get(g.responsableId)
			if (existing) {
				existing.gates.push(g)
			} else {
				map.set(g.responsableId, { nom: g.responsableNom, gates: [g] })
			}
		}
		return [...map.values()].sort((a, b) => b.gates.length - a.gates.length)
	}, [filteredGates])

	async function handleValidate() {
		if (!validating) return
		try {
			await validateGate({ id: validating })
			toast.success("Tâche validée avec succès")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setValidating(null)
		}
	}

	async function handleReject() {
		if (!rejecting || !rejectComment.trim()) return
		try {
			await rejectGate({ id: rejecting, commentaire: rejectComment.trim() })
			toast.success("Tâche rejetée — tâche de révision créée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setRejecting(null)
			setRejectComment("")
		}
	}

	if (gates === undefined) {
		return (
			<div className="p-6 space-y-4">
				<Skeleton className="h-8 w-64" />
				<div className="grid grid-cols-3 gap-3">
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
				</div>
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}

	return (
		<div>
			<PageHeader
				title="Validations"
				description="Vérification hiérarchique des tâches fiscales"
				actions={
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
				}
			/>

			{/* Stats */}
			<div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-6 py-4">
				<StatCard
					label="Mes validations"
					value={myGatesCount}
					icon={ShieldCheck}
					color="#2E6965"
					borderColor="border-l-[#2E6965]"
					bgTint="#2E696510"
				/>
				<StatCard
					label="Total en attente"
					value={totalCount}
					icon={Clock}
					color="#f59e0b"
					borderColor="border-l-amber-400"
					bgTint="#f59e0b10"
				/>
				<StatCard
					label="En retard"
					value={overdueCount}
					icon={XCircle}
					color="#ef4444"
					borderColor="border-l-red-400"
					bgTint="#ef444410"
				/>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3 px-6 pb-4">
				<Select value={filterResponsable} onValueChange={setFilterResponsable}>
					<SelectTrigger className="w-52 h-9 text-sm">
						<SelectValue placeholder="Responsable" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="me">Mes validations</SelectItem>
						{isAdmin && <SelectItem value="all">Toutes les validations</SelectItem>}
						{isAdmin &&
							responsables.map(([id, nom]) => (
								<SelectItem key={id} value={id}>
									{nom}
								</SelectItem>
							))}
					</SelectContent>
				</Select>
				<Select value={filterAssigne} onValueChange={setFilterAssigne}>
					<SelectTrigger className="w-52 h-9 text-sm">
						<SelectValue placeholder="Assigné" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous les assignés</SelectItem>
						{assignes.map(([id, nom]) => (
							<SelectItem key={id} value={id}>
								{nom}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{(filterResponsable !== "me" || filterAssigne !== "all") && (
					<button
						type="button"
						onClick={() => {
							setFilterResponsable("me")
							setFilterAssigne("all")
						}}
						className="text-xs text-muted-foreground hover:text-foreground underline"
					>
						Réinitialiser
					</button>
				)}
			</div>

			{/* Content */}
			<div className="px-6 pb-6">
				{filteredGates.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2E6965]/10 mb-4">
							<ShieldCheck className="h-7 w-7 text-[#2E6965]" />
						</div>
						<p className="text-sm font-medium text-foreground">Aucune validation en attente</p>
						<p className="text-xs text-muted-foreground mt-1">
							{filterResponsable === "me"
								? "Vous n'avez aucune tâche à valider pour le moment."
								: "Aucune tâche ne correspond aux filtres sélectionnés."}
						</p>
					</div>
				) : view === "list" ? (
					/* ── LIST VIEW ── */
					<div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/30">
									<TableHead className="font-semibold text-[#063238]">Tâche</TableHead>
									<TableHead className="font-semibold text-[#063238]">Client</TableHead>
									<TableHead className="hidden md:table-cell font-semibold text-[#063238]">
										Catégorie
									</TableHead>
									<TableHead className="hidden md:table-cell font-semibold text-[#063238]">
										Assigné
									</TableHead>
									<TableHead className="hidden lg:table-cell font-semibold text-[#063238]">
										Responsable
									</TableHead>
									<TableHead className="hidden md:table-cell font-semibold text-[#063238]">
										Échéance
									</TableHead>
									<TableHead className="text-right font-semibold text-[#063238]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredGates.map((gate) => {
									const overdue = isOverdue(gate.tacheDateEcheance)
									const catColors = gate.tacheCategorie
										? CATEGORIE_COLORS[gate.tacheCategorie]
										: null
									return (
										<TableRow
											key={gate._id}
											className={cn("group transition-colors", overdue && "bg-red-50/40")}
										>
											<TableCell>
												<div className="flex items-center gap-2">
													<span className="font-medium text-sm">{gate.tacheNom}</span>
													{overdue && (
														<Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
															En retard
														</Badge>
													)}
												</div>
											</TableCell>
											<TableCell>
												<span className="text-sm text-muted-foreground">{gate.clientName}</span>
											</TableCell>
											<TableCell className="hidden md:table-cell">
												{gate.tacheCategorie && catColors && (
													<Badge
														variant="secondary"
														className={cn("text-[10px]", catColors.bg, catColors.text)}
													>
														{gate.tacheCategorie}
													</Badge>
												)}
											</TableCell>
											<TableCell className="hidden md:table-cell">
												<div className="flex items-center gap-1.5">
													<div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2E6965]/10 text-[9px] font-bold text-[#2E6965]">
														{(gate.tacheAssigneNom ?? "?")
															.split(" ")
															.map((w) => w[0])
															.join("")
															.toUpperCase()
															.slice(0, 2)}
													</div>
													<span className="text-sm">{gate.tacheAssigneNom ?? "—"}</span>
												</div>
											</TableCell>
											<TableCell className="hidden lg:table-cell">
												<span className="text-sm font-medium">{gate.responsableNom}</span>
											</TableCell>
											<TableCell className="hidden md:table-cell">
												<span
													className={cn(
														"text-sm",
														overdue ? "text-red-600 font-medium" : "text-muted-foreground",
													)}
												>
													{formatDate(gate.tacheDateEcheance)}
												</span>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														size="sm"
														className="h-7 text-xs bg-[#2E6965] hover:bg-[#245552] text-white"
														onClick={() => setValidating(gate._id)}
													>
														<CheckCircle2 className="mr-1 h-3.5 w-3.5" />
														Valider
													</Button>
													<Button
														size="sm"
														variant="outline"
														className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
														onClick={() => setRejecting(gate._id)}
													>
														<XCircle className="mr-1 h-3.5 w-3.5" />
														Rejeter
													</Button>
												</div>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>
				) : (
					/* ── KANBAN VIEW ── */
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{groupedByResponsable.map((group) => (
							<div key={group.nom} className="flex flex-col rounded-xl bg-muted/30 min-h-[300px]">
								{/* Column header */}
								<div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40 rounded-t-xl bg-[#f59e0b08]">
									<div className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0 bg-[#f59e0b15]">
										<ShieldCheck className="h-3.5 w-3.5" style={{ color: "#f59e0b" }} />
									</div>
									<span className="text-xs font-semibold uppercase tracking-wider text-[#063238]">
										{group.nom}
									</span>
									<span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white bg-amber-500 shrink-0">
										{group.gates.length}
									</span>
								</div>

								{/* Cards */}
								<div className="flex-1 space-y-2 overflow-y-auto p-2">
									{group.gates.map((gate) => (
										<GateCard
											key={gate._id}
											gate={gate}
											onValidate={setValidating}
											onReject={setRejecting}
										/>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Dialog: confirmation validation */}
			<AlertDialog open={validating !== null} onOpenChange={(open) => !open && setValidating(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Valider cette tâche ?</AlertDialogTitle>
						<AlertDialogDescription>
							La tâche sera marquée comme terminée et le collaborateur sera notifié.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction onClick={handleValidate} className="bg-[#2E6965] hover:bg-[#245552]">
							Valider
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Dialog: rejet avec commentaire */}
			<Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rejeter cette tâche</DialogTitle>
						<DialogDescription>
							Indiquez le motif du rejet. Une tâche de révision sera créée pour le collaborateur.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Motif du rejet..."
						value={rejectComment}
						onChange={(e) => setRejectComment(e.target.value)}
						rows={3}
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRejecting(null)}>
							Annuler
						</Button>
						<Button variant="destructive" onClick={handleReject} disabled={!rejectComment.trim()}>
							Rejeter
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
