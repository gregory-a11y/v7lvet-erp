"use client"

import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	Handshake,
	ListChecks,
	Phone,
	RefreshCw,
	XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Doc } from "@/convex/_generated/dataModel"
import {
	useLeadsForKanban,
	useMarkAsLost,
	useMoveToStage,
	useReorderLead,
} from "@/lib/hooks/use-leads"
import { KanbanColumn } from "./kanban-column"
import { LostReasonDialog } from "./lost-reason-dialog"
import { ValidateOnboardingDialog } from "./validate-onboarding-dialog"

const PIPELINE_COLUMNS = [
	{ statut: "prise_de_contact", label: "Prise de contact", icon: Phone, color: "#94a3b8" },
	{ statut: "rendez_vous", label: "Rendez-vous", icon: Handshake, color: "#60a5fa" },
	{ statut: "qualification", label: "Qualification", icon: Eye, color: "#8b5cf6" },
	{ statut: "go_no_go", label: "Go / No Go", icon: AlertTriangle, color: "#f59e0b" },
	{ statut: "valide", label: "Validé", icon: CheckCircle2, color: "#2E6965" },
	{ statut: "onboarding", label: "Onboarding", icon: ListChecks, color: "#059669" },
]

const LATERAL_COLUMNS = [
	{ statut: "perdu", label: "Perdu", icon: XCircle, color: "#ef4444" },
	{ statut: "a_relancer", label: "À relancer", icon: RefreshCw, color: "#f97316" },
]

interface KanbanBoardProps {
	teamMembers?: Array<{ userId: string; nom?: string }>
}

export function KanbanBoard({ teamMembers }: KanbanBoardProps) {
	const grouped = useLeadsForKanban()
	const moveToStage = useMoveToStage()
	const reorderLead = useReorderLead()
	const markAsLost = useMarkAsLost()

	// Optimistic local state — tracks pending mutations
	const [optimisticState, setOptimisticState] = useState<Record<string, Doc<"leads">[]> | null>(
		null,
	)
	const pendingMutationsRef = useRef(0)

	// Sync server data only when no mutations are in-flight
	useEffect(() => {
		if (grouped && pendingMutationsRef.current === 0) {
			setOptimisticState(null)
		}
	}, [grouped])

	// Lost reason dialog
	const [lostDialogOpen, setLostDialogOpen] = useState(false)
	const [pendingLostLead, setPendingLostLead] = useState<string | null>(null)

	// Validate onboarding dialog
	const [validateDialogOpen, setValidateDialogOpen] = useState(false)
	const [pendingValidateLead, setPendingValidateLead] = useState<Doc<"leads"> | null>(null)

	const handleDragEnd = useCallback(
		async (result: DropResult) => {
			const { draggableId, source, destination } = result
			if (!destination) return
			if (source.droppableId === destination.droppableId && source.index === destination.index)
				return

			const sourceStatut = source.droppableId
			const destStatut = destination.droppableId
			const currentData = optimisticState ?? grouped
			if (!currentData) return

			// Compute optimistic state
			const next = { ...currentData }
			const sourceList = [...(next[sourceStatut] ?? [])]
			const destList = sourceStatut === destStatut ? sourceList : [...(next[destStatut] ?? [])]

			const [moved] = sourceList.splice(source.index, 1)
			if (!moved) return

			const updatedLead = {
				...moved,
				statut: destStatut as Doc<"leads">["statut"],
				order: destination.index,
			}
			destList.splice(destination.index, 0, updatedLead)

			next[sourceStatut] = sourceList
			if (sourceStatut !== destStatut) {
				next[destStatut] = destList
			}

			setOptimisticState(next)
			pendingMutationsRef.current++

			// If dropping on "perdu", show dialog
			if (destStatut === "perdu" && sourceStatut !== "perdu") {
				setPendingLostLead(draggableId)
				setLostDialogOpen(true)
				return
			}

			// If dropping on "valide" from another stage, show onboarding dialog
			if (destStatut === "valide" && sourceStatut !== "valide") {
				setPendingValidateLead(moved)
				setValidateDialogOpen(true)
				return
			}

			// Server update
			try {
				if (sourceStatut !== destStatut) {
					await moveToStage({ id: draggableId as any, statut: destStatut })
				} else {
					await reorderLead({
						id: draggableId as any,
						statut: destStatut,
						newOrder: destination.index,
					})
				}
			} finally {
				pendingMutationsRef.current--
				if (pendingMutationsRef.current === 0) {
					setOptimisticState(null)
				}
			}
		},
		[grouped, optimisticState, moveToStage, reorderLead],
	)

	const handleLostConfirm = useCallback(
		async (raisonPerte: string) => {
			if (!pendingLostLead) return
			try {
				await markAsLost({ id: pendingLostLead as any, raisonPerte })
			} finally {
				setPendingLostLead(null)
				setLostDialogOpen(false)
				pendingMutationsRef.current--
				if (pendingMutationsRef.current === 0) {
					setOptimisticState(null)
				}
			}
		},
		[pendingLostLead, markAsLost],
	)

	const handleLostCancel = useCallback(() => {
		setPendingLostLead(null)
		setLostDialogOpen(false)
		pendingMutationsRef.current--
		if (pendingMutationsRef.current === 0) {
			setOptimisticState(null)
		}
	}, [])

	const handleValidateConfirm = useCallback(
		async (responsableId: string) => {
			if (!pendingValidateLead) return
			try {
				await moveToStage({
					id: pendingValidateLead._id,
					statut: "valide",
					onboardingAssigneId: responsableId,
				})
			} finally {
				setPendingValidateLead(null)
				setValidateDialogOpen(false)
				pendingMutationsRef.current--
				if (pendingMutationsRef.current === 0) {
					setOptimisticState(null)
				}
			}
		},
		[pendingValidateLead, moveToStage],
	)

	const handleValidateCancel = useCallback(() => {
		setPendingValidateLead(null)
		setValidateDialogOpen(false)
		pendingMutationsRef.current--
		if (pendingMutationsRef.current === 0) {
			setOptimisticState(null)
		}
	}, [])

	const data = optimisticState ?? grouped

	if (!data) {
		return (
			<div className="flex gap-1.5 p-3">
				{PIPELINE_COLUMNS.map((col) => (
					<div
						key={col.statut}
						className="flex-1 min-w-0 h-[400px] rounded-xl bg-muted/40 animate-pulse"
					/>
				))}
			</div>
		)
	}

	return (
		<>
			<DragDropContext onDragEnd={handleDragEnd}>
				<div className="flex gap-1.5 p-3 pb-6">
					{/* Pipeline columns */}
					<div className="flex gap-1.5 flex-1 min-w-0">
						{PIPELINE_COLUMNS.map((col) => (
							<KanbanColumn
								key={col.statut}
								statut={col.statut}
								label={col.label}
								icon={col.icon}
								color={col.color}
								leads={data[col.statut] ?? []}
								teamMembers={teamMembers}
							/>
						))}
					</div>

					{/* Separator */}
					<div className="w-px bg-border/60 shrink-0 my-2" />

					{/* Lateral columns */}
					<div className="flex gap-1.5 shrink-0">
						{LATERAL_COLUMNS.map((col) => (
							<KanbanColumn
								key={col.statut}
								statut={col.statut}
								label={col.label}
								icon={col.icon}
								color={col.color}
								leads={data[col.statut] ?? []}
								teamMembers={teamMembers}
								isLateral
							/>
						))}
					</div>
				</div>
			</DragDropContext>

			<LostReasonDialog
				open={lostDialogOpen}
				onConfirm={handleLostConfirm}
				onCancel={handleLostCancel}
			/>

			<ValidateOnboardingDialog
				open={validateDialogOpen}
				lead={pendingValidateLead}
				teamMembers={teamMembers}
				onConfirm={handleValidateConfirm}
				onCancel={handleValidateCancel}
			/>
		</>
	)
}
