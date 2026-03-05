"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const PRIORITE_COLORS: Record<string, string> = {
	basse: "bg-slate-100 text-slate-600 border-slate-200",
	normale: "bg-blue-50 text-blue-600 border-blue-200",
	haute: "bg-orange-50 text-orange-600 border-orange-200",
	urgente: "bg-red-50 text-red-600 border-red-200",
}

export type TaskNodeData = {
	variant: "task" | "add"
	tacheId?: string
	titre?: string
	priorite?: string
	categorie?: string
	echeanceJoursApres?: number
}

export function AutoTaskNode({ data, selected }: NodeProps) {
	const d = data as TaskNodeData

	if (d.variant === "add") {
		return (
			<div className="rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-3 min-w-[180px] cursor-pointer transition-all hover:border-[#2E6965]/50 hover:bg-[#F4F5F3]/50 flex items-center justify-center gap-2">
				<Handle
					type="target"
					position={Position.Top}
					className="!bg-muted-foreground !w-2.5 !h-2.5"
				/>
				<Plus className="h-4 w-4 text-muted-foreground" />
				<span className="text-xs text-muted-foreground font-medium">Ajouter une tâche</span>
			</div>
		)
	}

	return (
		<div
			className={`rounded-lg border bg-[#F4F5F3] px-3 py-2.5 shadow-sm min-w-[180px] max-w-[260px] cursor-pointer transition-all ${
				selected ? "border-[#6242FB] ring-2 ring-[#6242FB]/20" : "hover:shadow-md"
			}`}
		>
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-muted-foreground !w-2.5 !h-2.5"
			/>
			<div className="flex items-center gap-1.5 mb-1">
				<div className="h-2 w-2 rounded-full bg-[#2E6965] shrink-0" />
				<p className="text-xs font-medium leading-tight truncate">{d.titre || "Sans titre"}</p>
			</div>
			<div className="flex flex-wrap items-center gap-1">
				{d.priorite && (
					<Badge
						variant="outline"
						className={`text-[9px] px-1.5 py-0 ${PRIORITE_COLORS[d.priorite] ?? ""}`}
					>
						{d.priorite}
					</Badge>
				)}
				{d.categorie && (
					<Badge
						variant="outline"
						className="text-[9px] px-1.5 py-0 border-[#2E6965]/30 text-[#2E6965]"
					>
						{d.categorie}
					</Badge>
				)}
				{d.echeanceJoursApres != null && (
					<Badge variant="secondary" className="text-[9px] px-1.5 py-0">
						J+{d.echeanceJoursApres}
					</Badge>
				)}
			</div>
		</div>
	)
}
