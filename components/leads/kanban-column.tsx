"use client"

import { Droppable } from "@hello-pangea/dnd"
import type { LucideIcon } from "lucide-react"
import type { Doc } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { KanbanCard } from "./kanban-card"

interface KanbanColumnProps {
	statut: string
	label: string
	icon: LucideIcon
	color: string
	leads: Doc<"leads">[]
	teamMembers?: Array<{ userId: string; nom?: string }>
	isLateral?: boolean
}

export function KanbanColumn({
	statut,
	label,
	icon: Icon,
	color,
	leads,
	teamMembers,
	isLateral,
}: KanbanColumnProps) {
	const totalMontant = leads.reduce((sum, l) => sum + (l.montantEstime ?? 0), 0)

	return (
		<div
			className={cn(
				"flex flex-col rounded-xl bg-muted/40",
				isLateral ? "w-[140px] shrink-0" : "flex-1 min-w-0",
			)}
		>
			{/* Column header */}
			<div
				className="flex items-center gap-1.5 px-2 py-2 border-b border-border/40 rounded-t-xl"
				style={{ backgroundColor: `${color}08` }}
			>
				<div
					className="flex h-5 w-5 items-center justify-center rounded-md shrink-0"
					style={{ backgroundColor: `${color}15` }}
				>
					<Icon className="h-3 w-3" style={{ color }} />
				</div>
				<span className="text-[10px] font-semibold uppercase tracking-wider truncate">{label}</span>
				<span
					className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white shrink-0"
					style={{ backgroundColor: color }}
				>
					{leads.length}
				</span>
			</div>

			{/* Montant total */}
			{totalMontant > 0 && (
				<div className="px-2 py-0.5 text-[9px] text-muted-foreground">
					{totalMontant >= 1000
						? `${(totalMontant / 1000).toFixed(0)}k €`
						: `${totalMontant.toLocaleString("fr-FR")} €`}
				</div>
			)}

			{/* Droppable area */}
			<Droppable droppableId={statut}>
				{(provided, snapshot) => (
					<div
						ref={provided.innerRef}
						{...provided.droppableProps}
						className={cn(
							"flex-1 space-y-1.5 overflow-y-auto p-1.5 transition-colors min-h-[120px]",
							snapshot.isDraggingOver && "bg-primary/5 rounded-b-xl",
						)}
					>
						{leads.map((lead, index) => (
							<KanbanCard key={lead._id} lead={lead} index={index} teamMembers={teamMembers} />
						))}
						{provided.placeholder}
					</div>
				)}
			</Droppable>
		</div>
	)
}
