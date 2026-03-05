"use client"

import {
	Bot,
	Calendar,
	Clock,
	ListChecks,
	MoreHorizontal,
	Pencil,
	Plus,
	Trash2,
	Users,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import type { Doc } from "@/convex/_generated/dataModel"
import {
	useRemoveTaskAutomation,
	useTaskAutomations,
	useToggleTaskAutomation,
} from "@/lib/hooks/use-task-automations"

const AutomationFlowEditor = dynamic(
	() => import("./automation-flow-editor").then((m) => m.AutomationFlowEditor),
	{ ssr: false },
)

const FREQUENCE_LABELS: Record<string, string> = {
	quotidien: "Quotidien",
	hebdomadaire: "Hebdomadaire",
	mensuel: "Mensuel",
	trimestriel: "Trimestriel",
	annuel: "Annuel",
}

function formatNextExecution(ts?: number): string {
	if (!ts) return "—"
	const d = new Date(ts)
	return d.toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
		year: "numeric",
	})
}

type EnrichedAuto = Doc<"taskAutomations"> & {
	fonctionNom?: string
	prestationTitres?: string[]
	tachesCount?: number
}

function AutomationCard({ auto, onEdit }: { auto: EnrichedAuto; onEdit: () => void }) {
	const toggle = useToggleTaskAutomation()
	const remove = useRemoveTaskAutomation()
	const [deleting, setDeleting] = useState(false)

	const handleToggle = async () => {
		try {
			await toggle(auto._id)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	const handleDelete = async () => {
		setDeleting(true)
		try {
			await remove(auto._id)
			toast.success("Automatisation supprimée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setDeleting(false)
		}
	}

	// Build description line
	const modeLabel = auto.mode === "equipe" ? "Équipe" : "Client"
	let cibleDesc = ""
	if (auto.mode === "equipe") {
		if (auto.cibleEquipe === "tous") cibleDesc = "Tous les membres"
		else if (auto.cibleEquipe === "par_role") cibleDesc = `Rôle : ${auto.cibleRole}`
		else if (auto.cibleEquipe === "par_fonction")
			cibleDesc = `Fonction : ${auto.fonctionNom ?? "—"}`
	} else {
		const assignLabel =
			auto.assignationClient === "responsable_hierarchique"
				? "resp. hiérarchique"
				: "resp. opérationnel"
		cibleDesc = `Assigné au ${assignLabel}`
		const filterCount = [
			auto.filtresFormeJuridique,
			auto.filtresRegimeTVA,
			auto.filtresCategorieFiscale,
			auto.filtresActivite,
			auto.filtresFrequenceTVA,
			auto.filtresPrestationIds && auto.filtresPrestationIds.length > 0 ? "presta" : undefined,
		].filter(Boolean).length
		if (filterCount > 0) {
			cibleDesc += ` (${filterCount} filtre${filterCount > 1 ? "s" : ""})`
		}
	}

	let planifDesc = ""
	if (auto.planificationType === "frequence") {
		planifDesc = FREQUENCE_LABELS[auto.frequence ?? ""] ?? auto.frequence ?? ""
	} else {
		const refs: Record<string, string> = {
			dateClotureComptable: "clôture comptable",
			dateEntree: "date d'entrée",
			jourTVA: "jour TVA",
			datePaiementDividendes: "dividendes",
		}
		const decalage = auto.joursDecalage ?? 0
		const sign = decalage >= 0 ? "+" : ""
		planifDesc = `${sign}${decalage}j / ${refs[auto.dateReference ?? ""] ?? auto.dateReference}`
	}

	const taskCount = auto.tachesCount ?? auto.taches.length

	return (
		<Card
			className={`transition-opacity cursor-pointer ${!auto.isActive ? "opacity-60" : ""}`}
			onClick={onEdit}
		>
			<CardContent className="p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0 space-y-1.5">
						<div className="flex items-center gap-2">
							<h4 className="text-sm font-semibold truncate">{auto.nom}</h4>
							<Badge variant="outline" className="text-[10px] shrink-0">
								{modeLabel}
							</Badge>
							<Badge variant="secondary" className="text-[10px] shrink-0">
								<ListChecks className="h-3 w-3 mr-1" />
								{taskCount} tâche{taskCount > 1 ? "s" : ""}
							</Badge>
						</div>

						{auto.description && (
							<p className="text-xs text-muted-foreground line-clamp-1">{auto.description}</p>
						)}

						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<Users className="h-3 w-3" /> {cibleDesc}
							</span>
							<span className="flex items-center gap-1">
								<Clock className="h-3 w-3" /> {planifDesc}
							</span>
							<span className="flex items-center gap-1">
								<Calendar className="h-3 w-3" /> Prochaine :{" "}
								{formatNextExecution(auto.nextExecutionAt)}
							</span>
						</div>
					</div>

					{/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation only */}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation only */}
					<div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
						<Switch checked={auto.isActive} onCheckedChange={handleToggle} />

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="h-7 w-7 p-0">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={onEdit}>
									<Pencil className="h-3.5 w-3.5 mr-2" /> Modifier
								</DropdownMenuItem>
								<DropdownMenuItem
									className="text-destructive"
									onClick={handleDelete}
									disabled={deleting}
								>
									<Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export function AutomationsTab() {
	const automations = useTaskAutomations()
	// null = list view, "new" = new automation, Id = editing existing
	const [editingId, setEditingId] = useState<string | null>(null)

	const editingAuto =
		editingId && editingId !== "new"
			? (automations?.find((a) => a._id === editingId) ?? null)
			: null

	if (editingId) {
		return <AutomationFlowEditor editing={editingAuto ?? null} onBack={() => setEditingId(null)} />
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Règles qui génèrent automatiquement des tâches à fréquences configurables
				</p>
				<Button size="sm" className="gap-1.5" onClick={() => setEditingId("new")}>
					<Plus className="h-4 w-4" />
					Nouvelle automatisation
				</Button>
			</div>

			{automations === undefined ? (
				<p className="text-sm text-muted-foreground py-8 text-center">Chargement...</p>
			) : automations.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
					<Bot className="h-10 w-10 mb-3 text-muted-foreground/40" />
					<p className="font-medium">Aucune automatisation configurée</p>
					<p className="text-xs mt-1">
						Créez votre première règle pour automatiser la génération de tâches
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{automations.map((auto) => (
						<AutomationCard key={auto._id} auto={auto} onEdit={() => setEditingId(auto._id)} />
					))}
				</div>
			)}
		</div>
	)
}
