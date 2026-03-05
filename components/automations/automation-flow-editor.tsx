"use client"

import {
	Background,
	type Edge,
	type Node,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ArrowLeft, History, Save, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import {
	useCreateTaskAutomation,
	useRemoveTaskAutomation,
	useToggleTaskAutomation,
	useUpdateTaskAutomation,
} from "@/lib/hooks/use-task-automations"
import { AutoScheduleNode } from "./auto-schedule-node"
import { AutoTaskNode } from "./auto-task-node"
import { AutoTriggerNode } from "./auto-trigger-node"
import { AutomationEditorPanel, type SelectedNodeType } from "./automation-editor-panel"
import { AutomationLogsPanel } from "./automation-logs-panel"

// =============================================================================
// Types exported for use in panel
// =============================================================================

export type TacheItem = {
	id: string
	titre: string
	description?: string
	priorite: "basse" | "normale" | "haute" | "urgente"
	categorie?: string
	tags?: string[]
	echeanceJoursApres?: number
	sopIds?: string[]
}

export type AutomationFormData = {
	nom: string
	description: string
	mode: "equipe" | "client"
	cibleEquipe: "tous" | "par_role" | "par_fonction"
	cibleRole: "admin" | "manager" | "collaborateur"
	cibleFonctionId: string
	assignationClient: "responsable_operationnel" | "responsable_hierarchique"
	filtresPrestationIds: string[]
	filtresFormeJuridique: string
	filtresRegimeTVA: string
	filtresCategorieFiscale: string
	filtresActivite: string
	filtresFrequenceTVA: string
	planificationType: "frequence" | "date_relative"
	frequence: "quotidien" | "hebdomadaire" | "mensuel" | "trimestriel" | "annuel"
	jourSemaine: number
	jourMois: number
	moisTrimestre: number
	moisAnnee: number
	dateReference: "dateClotureComptable" | "dateEntree" | "jourTVA" | "datePaiementDividendes"
	joursDecalage: number
	periodeRelative: "annuel" | "selon_frequence_tva"
	taches: TacheItem[]
}

const DEFAULT_FORM: AutomationFormData = {
	nom: "",
	description: "",
	mode: "equipe",
	cibleEquipe: "tous",
	cibleRole: "admin",
	cibleFonctionId: "",
	assignationClient: "responsable_operationnel",
	filtresPrestationIds: [],
	filtresFormeJuridique: "",
	filtresRegimeTVA: "",
	filtresCategorieFiscale: "",
	filtresActivite: "",
	filtresFrequenceTVA: "",
	planificationType: "frequence",
	frequence: "mensuel",
	jourSemaine: 0,
	jourMois: 1,
	moisTrimestre: 1,
	moisAnnee: 1,
	dateReference: "dateClotureComptable",
	joursDecalage: 0,
	periodeRelative: "annuel",
	taches: [
		{
			id: crypto.randomUUID(),
			titre: "",
			priorite: "normale",
		},
	],
}

function docToForm(doc: Doc<"taskAutomations">): AutomationFormData {
	return {
		nom: doc.nom,
		description: doc.description ?? "",
		mode: doc.mode,
		cibleEquipe: doc.cibleEquipe ?? "tous",
		cibleRole: doc.cibleRole ?? "admin",
		cibleFonctionId: (doc.cibleFonctionId as string) ?? "",
		assignationClient: doc.assignationClient ?? "responsable_operationnel",
		filtresPrestationIds: (doc.filtresPrestationIds ?? []) as string[],
		filtresFormeJuridique: doc.filtresFormeJuridique ?? "",
		filtresRegimeTVA: doc.filtresRegimeTVA ?? "",
		filtresCategorieFiscale: doc.filtresCategorieFiscale ?? "",
		filtresActivite: doc.filtresActivite ?? "",
		filtresFrequenceTVA: doc.filtresFrequenceTVA ?? "",
		planificationType: doc.planificationType,
		frequence: doc.frequence ?? "mensuel",
		jourSemaine: doc.jourSemaine ?? 0,
		jourMois: doc.jourMois ?? 1,
		moisTrimestre: doc.moisTrimestre ?? 1,
		moisAnnee: doc.moisAnnee ?? 1,
		dateReference: doc.dateReference ?? "dateClotureComptable",
		joursDecalage: doc.joursDecalage ?? 0,
		periodeRelative: doc.periodeRelative ?? "annuel",
		taches: doc.taches.map((t) => ({
			id: t.id,
			titre: t.titre,
			description: t.description,
			priorite: t.priorite,
			categorie: t.categorie,
			tags: t.tags,
			echeanceJoursApres: t.echeanceJoursApres,
			sopIds: (t.sopIds ?? []) as string[],
		})),
	}
}

// =============================================================================
// Node types for ReactFlow
// =============================================================================

const nodeTypes = {
	autoTrigger: AutoTriggerNode,
	autoSchedule: AutoScheduleNode,
	autoTask: AutoTaskNode,
}

// =============================================================================
// Build Flow from FormData
// =============================================================================

function buildFlowFromData(form: AutomationFormData): { nodes: Node[]; edges: Edge[] } {
	const nodes: Node[] = []
	const edges: Edge[] = []

	// Calculate filter count for trigger display
	const filtresCount = [
		form.filtresFormeJuridique,
		form.filtresRegimeTVA,
		form.filtresCategorieFiscale,
		form.filtresActivite,
		form.filtresFrequenceTVA,
		form.filtresPrestationIds.length > 0 ? "presta" : undefined,
	].filter(Boolean).length

	// Trigger node
	nodes.push({
		id: "trigger",
		type: "autoTrigger",
		position: { x: 0, y: 0 },
		data: {
			mode: form.mode,
			cibleEquipe: form.cibleEquipe,
			cibleRole: form.cibleRole,
			assignationClient: form.assignationClient,
			filtresCount,
		},
	})

	// Schedule node
	nodes.push({
		id: "schedule",
		type: "autoSchedule",
		position: { x: 0, y: 130 },
		data: {
			planificationType: form.planificationType,
			frequence: form.frequence,
			jourSemaine: form.jourSemaine,
			jourMois: form.jourMois,
			dateReference: form.dateReference,
			joursDecalage: form.joursDecalage,
		},
	})

	edges.push({
		id: "trigger-schedule",
		source: "trigger",
		target: "schedule",
		style: { stroke: "#94a3b8", strokeWidth: 2 },
	})

	// Task nodes — fan-out horizontal
	const taskCount = form.taches.length
	const taskSpacing = 220
	const totalWidth = (taskCount - 1) * taskSpacing
	const startX = -totalWidth / 2

	form.taches.forEach((tache, i) => {
		const nodeId = `task-${tache.id}`
		nodes.push({
			id: nodeId,
			type: "autoTask",
			position: { x: startX + i * taskSpacing, y: 280 },
			data: {
				variant: "task",
				tacheId: tache.id,
				titre: tache.titre,
				priorite: tache.priorite,
				categorie: tache.categorie,
				echeanceJoursApres: tache.echeanceJoursApres,
			},
		})

		edges.push({
			id: `schedule-${nodeId}`,
			source: "schedule",
			target: nodeId,
			style: { stroke: "#94a3b8", strokeWidth: 2 },
		})
	})

	// Add button node
	nodes.push({
		id: "add-task",
		type: "autoTask",
		position: { x: 0, y: 420 },
		data: { variant: "add" },
	})

	return { nodes, edges }
}

// =============================================================================
// Flow Editor Inner (needs ReactFlow context)
// =============================================================================

function FlowEditorInner({
	editing,
	onBack,
}: {
	editing: Doc<"taskAutomations"> | null
	onBack: () => void
}) {
	const [form, setForm] = useState<AutomationFormData>(
		editing
			? docToForm(editing)
			: { ...DEFAULT_FORM, taches: [{ id: crypto.randomUUID(), titre: "", priorite: "normale" }] },
	)
	const [saving, setSaving] = useState(false)
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
	const [showLogs, setShowLogs] = useState(false)
	const { fitView } = useReactFlow()

	const create = useCreateTaskAutomation()
	const update = useUpdateTaskAutomation()
	const remove = useRemoveTaskAutomation()
	const toggle = useToggleTaskAutomation()

	// Build ReactFlow data from form state
	const { nodes, edges } = useMemo(() => buildFlowFromData(form), [form])

	const tachesCount = form.taches.length
	// biome-ignore lint/correctness/useExhaustiveDependencies: tachesCount triggers re-fit on task add/remove
	useEffect(() => {
		const timer = setTimeout(() => fitView({ padding: 0.3 }), 50)
		return () => clearTimeout(timer)
	}, [tachesCount, fitView])

	// Determine panel state
	const panelState = useMemo<{
		type: SelectedNodeType
		taskId?: string
	} | null>(() => {
		if (!selectedNodeId) return null
		if (selectedNodeId === "trigger") return { type: "trigger" }
		if (selectedNodeId === "schedule") return { type: "schedule" }
		if (selectedNodeId === "add-task") return null
		if (selectedNodeId.startsWith("task-")) {
			const taskId = selectedNodeId.replace("task-", "")
			return { type: "task", taskId }
		}
		return null
	}, [selectedNodeId])

	const handleFormChange = useCallback((updates: Partial<AutomationFormData>) => {
		setForm((prev) => ({ ...prev, ...updates }))
	}, [])

	const handleUpdateTask = useCallback((taskId: string, updates: Partial<TacheItem>) => {
		setForm((prev) => ({
			...prev,
			taches: prev.taches.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
		}))
	}, [])

	const handleDeleteTask = useCallback((taskId: string) => {
		setForm((prev) => {
			if (prev.taches.length <= 1) {
				toast.error("Au moins une tâche est requise")
				return prev
			}
			return { ...prev, taches: prev.taches.filter((t) => t.id !== taskId) }
		})
		setSelectedNodeId(null)
	}, [])

	const handleAddTask = useCallback(() => {
		const newId = crypto.randomUUID()
		setForm((prev) => ({
			...prev,
			taches: [...prev.taches, { id: newId, titre: "", priorite: "normale" as const }],
		}))
		setSelectedNodeId(`task-${newId}`)
	}, [])

	const handleNodeClick = useCallback(
		(_: React.MouseEvent, node: Node) => {
			if (node.id === "add-task") {
				handleAddTask()
				return
			}
			setSelectedNodeId(node.id)
		},
		[handleAddTask],
	)

	const handlePaneClick = useCallback(() => {
		setSelectedNodeId(null)
	}, [])

	const handleSave = async () => {
		if (!form.nom.trim()) {
			toast.error("Le nom est obligatoire")
			return
		}
		const emptyTasks = form.taches.filter((t) => !t.titre.trim())
		if (emptyTasks.length > 0) {
			toast.error("Toutes les tâches doivent avoir un titre")
			return
		}

		setSaving(true)
		try {
			const args = {
				nom: form.nom.trim(),
				description: form.description.trim() || undefined,
				mode: form.mode,
				cibleEquipe: form.mode === "equipe" ? form.cibleEquipe : undefined,
				cibleRole:
					form.mode === "equipe" && form.cibleEquipe === "par_role" ? form.cibleRole : undefined,
				cibleFonctionId:
					form.mode === "equipe" && form.cibleEquipe === "par_fonction" && form.cibleFonctionId
						? (form.cibleFonctionId as Id<"fonctions">)
						: undefined,
				assignationClient: form.mode === "client" ? form.assignationClient : undefined,
				filtresPrestationIds:
					form.mode === "client" && form.filtresPrestationIds.length > 0
						? (form.filtresPrestationIds as Id<"prestations">[])
						: undefined,
				filtresFormeJuridique:
					form.mode === "client" && form.filtresFormeJuridique
						? form.filtresFormeJuridique
						: undefined,
				filtresRegimeTVA:
					form.mode === "client" && form.filtresRegimeTVA ? form.filtresRegimeTVA : undefined,
				filtresCategorieFiscale:
					form.mode === "client" && form.filtresCategorieFiscale
						? form.filtresCategorieFiscale
						: undefined,
				filtresActivite:
					form.mode === "client" && form.filtresActivite ? form.filtresActivite : undefined,
				filtresFrequenceTVA:
					form.mode === "client" && form.filtresFrequenceTVA ? form.filtresFrequenceTVA : undefined,
				planificationType: form.planificationType,
				frequence: form.planificationType === "frequence" ? form.frequence : undefined,
				jourSemaine:
					form.planificationType === "frequence" && form.frequence === "hebdomadaire"
						? form.jourSemaine
						: undefined,
				jourMois:
					form.planificationType === "frequence" &&
					["mensuel", "trimestriel", "annuel"].includes(form.frequence)
						? form.jourMois
						: undefined,
				moisTrimestre:
					form.planificationType === "frequence" && form.frequence === "trimestriel"
						? form.moisTrimestre
						: undefined,
				moisAnnee:
					form.planificationType === "frequence" && form.frequence === "annuel"
						? form.moisAnnee
						: undefined,
				dateReference: form.planificationType === "date_relative" ? form.dateReference : undefined,
				joursDecalage: form.planificationType === "date_relative" ? form.joursDecalage : undefined,
				periodeRelative:
					form.planificationType === "date_relative" && form.dateReference === "jourTVA"
						? form.periodeRelative
						: undefined,
				taches: form.taches.map((t) => ({
					id: t.id,
					titre: t.titre.trim(),
					description: t.description?.trim() || undefined,
					priorite: t.priorite,
					categorie: t.categorie || undefined,
					tags: t.tags && t.tags.length > 0 ? t.tags : undefined,
					echeanceJoursApres: t.echeanceJoursApres,
					sopIds: t.sopIds && t.sopIds.length > 0 ? (t.sopIds as Id<"sops">[]) : undefined,
				})),
			}

			if (editing) {
				await update({ id: editing._id, ...args })
				toast.success("Automatisation mise à jour")
			} else {
				await create(args)
				toast.success("Automatisation créée")
			}
			onBack()
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async () => {
		if (!editing) return
		try {
			await remove(editing._id)
			toast.success("Automatisation supprimée")
			onBack()
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	const handleToggle = async () => {
		if (!editing) return
		try {
			await toggle(editing._id)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div className="h-[calc(100vh-200px)] flex flex-col">
			{/* Top Bar */}
			<div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
				<Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
					<ArrowLeft className="h-4 w-4" />
					Retour
				</Button>

				<div className="flex-1 min-w-0">
					<Input
						value={form.nom}
						onChange={(e) => handleFormChange({ nom: e.target.value })}
						placeholder="Nom de l'automatisation"
						className="h-8 text-sm font-medium max-w-sm"
					/>
				</div>

				{editing && (
					<>
						<div className="hidden lg:flex items-center gap-3 text-[11px] text-muted-foreground border-l pl-3">
							{editing.lastExecutedAt && (
								<span>
									Dernière exec :{" "}
									{new Date(editing.lastExecutedAt).toLocaleDateString("fr-FR", {
										day: "numeric",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							)}
							{editing.nextExecutionAt && (
								<span>
									Prochaine :{" "}
									{new Date(editing.nextExecutionAt).toLocaleDateString("fr-FR", {
										day: "numeric",
										month: "short",
										year: "numeric",
									})}
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span>{editing.isActive ? "Actif" : "Inactif"}</span>
							<Switch checked={editing.isActive} onCheckedChange={handleToggle} />
						</div>
					</>
				)}

				{editing && (
					<Button
						variant={showLogs ? "secondary" : "outline"}
						size="sm"
						onClick={() => setShowLogs((v) => !v)}
						className="gap-1.5"
					>
						<History className="h-3.5 w-3.5" />
						Historique
					</Button>
				)}

				<Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
					<Save className="h-3.5 w-3.5" />
					{saving ? "Enregistrement..." : "Sauvegarder"}
				</Button>

				{editing && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleDelete}
						className="text-destructive gap-1.5"
					>
						<Trash2 className="h-3.5 w-3.5" />
						Supprimer
					</Button>
				)}
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="flex-1 flex overflow-hidden">
					{/* ReactFlow Canvas */}
					<div className={`flex-1 ${panelState ? "w-[70%]" : "w-full"} transition-all`}>
						<ReactFlow
							nodes={nodes}
							edges={edges}
							nodeTypes={nodeTypes}
							onNodeClick={handleNodeClick}
							onPaneClick={handlePaneClick}
							fitView
							fitViewOptions={{ padding: 0.3 }}
							nodesDraggable={false}
							nodesConnectable={false}
							elementsSelectable
							panOnDrag
							zoomOnScroll
							minZoom={0.5}
							maxZoom={1.5}
							proOptions={{ hideAttribution: true }}
						>
							<Background color="#e5e7eb" gap={20} />
						</ReactFlow>
					</div>

					{/* Editor Panel */}
					{panelState && (
						<div className="w-[30%] min-w-[320px] shrink-0">
							<AutomationEditorPanel
								selectedNodeType={panelState.type}
								selectedTaskId={panelState.taskId}
								form={form}
								onChange={handleFormChange}
								onUpdateTask={handleUpdateTask}
								onDeleteTask={handleDeleteTask}
								onClose={() => setSelectedNodeId(null)}
							/>
						</div>
					)}
				</div>

				{/* Logs Panel */}
				{showLogs && editing && <AutomationLogsPanel automationId={editing._id} />}
			</div>
		</div>
	)
}

// =============================================================================
// Exported Component (wrapped with ReactFlowProvider)
// =============================================================================

export function AutomationFlowEditor({
	editing,
	onBack,
}: {
	editing: Doc<"taskAutomations"> | null
	onBack: () => void
}) {
	return (
		<ReactFlowProvider>
			<FlowEditorInner editing={editing} onBack={onBack} />
		</ReactFlowProvider>
	)
}
