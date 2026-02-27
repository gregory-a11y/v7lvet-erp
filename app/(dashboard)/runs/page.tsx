"use client"

import { useMutation, useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { FormalisteView } from "@/components/runs/formaliste-view"
import type { ZoomLevel } from "@/components/runs/gantt-utils"
import { GanttView } from "@/components/runs/gantt-view"
import { type RunsFilters, RunsFiltersBar } from "@/components/runs/runs-filters"
import { type ViewMode, ViewToggle } from "@/components/runs/view-toggle"
import { PageHeader } from "@/components/shared/page-header"
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
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export default function RunsPage() {
	const router = useRouter()
	const { role: userRole } = useCurrentUser()

	// View mode
	const [viewMode, setViewMode] = useState<ViewMode>("formaliste")
	const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("mois")

	// Filters (shared between views)
	const [filters, setFilters] = useState<RunsFilters>({
		exercice: String(new Date().getFullYear()),
		status: "all",
		clientId: "all",
		categorie: "all",
	})

	// Create run dialog
	const clients = useQuery(api.clients.list, { status: "actif" })
	const createRun = useMutation(api.runs.create)
	const [open, setOpen] = useState(false)
	const [selectedClient, setSelectedClient] = useState<string>("")

	const canCreate = userRole === "admin" || userRole === "manager"

	// Formaliste view data
	const runs = useQuery(
		api.runs.list,
		viewMode === "formaliste"
			? {
					status: filters.status === "all" ? undefined : filters.status,
					exercice:
						filters.exercice && filters.exercice !== "all"
							? parseInt(filters.exercice, 10)
							: undefined,
					clientId:
						filters.clientId && filters.clientId !== "all"
							? (filters.clientId as Id<"clients">)
							: undefined,
				}
			: "skip",
	)

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
					<div className="flex items-center gap-3">
						<ViewToggle value={viewMode} onChange={setViewMode} />
						{canCreate && (
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
						)}
					</div>
				}
			/>

			{/* Filters */}
			<div className="px-6 py-4">
				<RunsFiltersBar filters={filters} onChange={setFilters} />
			</div>

			{/* Views */}
			<div className="px-6 pb-6">
				{viewMode === "formaliste" ? (
					<FormalisteView runs={runs} />
				) : (
					<GanttView filters={filters} zoom={zoomLevel} onZoomChange={setZoomLevel} />
				)}
			</div>
		</div>
	)
}
