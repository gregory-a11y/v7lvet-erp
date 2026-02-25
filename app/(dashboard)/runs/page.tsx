"use client"

import { useMutation, useQuery } from "convex/react"
import { Calendar, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { useSession } from "@/lib/auth-client"
import { STATUS_LABELS } from "@/lib/constants"

const STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-100 text-gray-800",
	en_cours: "bg-emerald-100 text-emerald-800",
	en_attente: "bg-amber-100 text-amber-800",
	termine: "bg-green-100 text-green-800",
}

export default function RunsPage() {
	const router = useRouter()
	const { data: session } = useSession()
	const [statusFilter, setStatusFilter] = useState<string>("all")
	const [exerciceFilter, setExerciceFilter] = useState<string>("")

	const runs = useQuery(api.runs.list, {
		status: statusFilter === "all" ? undefined : statusFilter,
		exercice: exerciceFilter ? parseInt(exerciceFilter, 10) : undefined,
	})
	const clients = useQuery(api.clients.list, { status: "actif" })
	const createRun = useMutation(api.runs.create)

	const [open, setOpen] = useState(false)
	const [selectedClient, setSelectedClient] = useState<string>("")

	const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
	const canCreate = userRole === "associe" || userRole === "manager"

	async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const form = new FormData(e.currentTarget)
		const exercice = parseInt(form.get("exercice") as string, 10)

		if (!selectedClient || !exercice) {
			toast.error("Client et exercice obligatoires")
			return
		}

		try {
			const runId = await createRun({
				clientId: selectedClient as Id<"clients">,
				exercice,
			})
			toast.success("Run créé avec tâches fiscales générées")
			setOpen(false)
			router.push(`/runs/${runId}`)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de la création")
		}
	}

	return (
		<div>
			<PageHeader
				title="Runs"
				description="Exercices fiscaux et obligations déclaratives"
				actions={
					canCreate ? (
						<Dialog open={open} onOpenChange={setOpen}>
							<DialogTrigger asChild>
								<Button>
									<Plus className="mr-2 h-4 w-4" />
									Nouveau run
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Créer un exercice fiscal</DialogTitle>
								</DialogHeader>
								<form onSubmit={handleCreate} className="space-y-4">
									<div>
										<Label>Client *</Label>
										<Select value={selectedClient} onValueChange={setSelectedClient}>
											<SelectTrigger>
												<SelectValue placeholder="Sélectionner un client" />
											</SelectTrigger>
											<SelectContent>
												{clients?.map((c) => (
													<SelectItem key={c._id} value={c._id}>
														{c.raisonSociale}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div>
										<Label htmlFor="exercice">Exercice (année) *</Label>
										<Input
											id="exercice"
											name="exercice"
											type="number"
											min={2020}
											max={2030}
											defaultValue={new Date().getFullYear()}
											required
										/>
									</div>
									<Button type="submit" className="w-full">
										Créer et générer les tâches
									</Button>
								</form>
							</DialogContent>
						</Dialog>
					) : undefined
				}
			/>

			{/* Filters */}
			<div className="flex items-center gap-3 px-6 py-4">
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous</SelectItem>
						<SelectItem value="a_venir">À venir</SelectItem>
						<SelectItem value="en_cours">En cours</SelectItem>
						<SelectItem value="en_attente">En attente</SelectItem>
						<SelectItem value="termine">Terminé</SelectItem>
					</SelectContent>
				</Select>
				<Input
					placeholder="Exercice (ex: 2025)"
					value={exerciceFilter}
					onChange={(e) => setExerciceFilter(e.target.value)}
					className="w-40"
					type="number"
				/>
			</div>

			{/* Table */}
			<div className="px-6">
				{runs === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : runs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">Aucun run</p>
						<p className="text-sm text-muted-foreground mt-1">
							Créez un exercice fiscal pour un client.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Client</TableHead>
									<TableHead>Exercice</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="hidden md:table-cell">Progression</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{runs.map((run) => (
									<TableRow
										key={run._id}
										className="cursor-pointer"
										onClick={() => router.push(`/runs/${run._id}`)}
									>
										<TableCell className="font-medium">{run.clientName}</TableCell>
										<TableCell>{run.exercice}</TableCell>
										<TableCell>
											<Badge variant="secondary" className={STATUS_COLORS[run.status] ?? ""}>
												{STATUS_LABELS[run.status] ?? run.status}
											</Badge>
										</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{run.tachesDone}/{run.tachesTotal} tâches
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</div>
	)
}
