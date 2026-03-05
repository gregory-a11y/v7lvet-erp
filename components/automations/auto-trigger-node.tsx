"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { Building2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type TriggerNodeData = {
	mode: "equipe" | "client"
	cibleEquipe?: "tous" | "par_role" | "par_fonction"
	cibleRole?: string
	fonctionNom?: string
	assignationClient?: string
	filtresCount?: number
}

export function AutoTriggerNode({ data, selected }: NodeProps) {
	const d = data as TriggerNodeData
	const isEquipe = d.mode === "equipe"
	const borderColor = isEquipe ? "#2E6965" : "#1d4ed8"
	const bgColor = isEquipe ? "#e8f5f3" : "#eff6ff"
	const iconColor = isEquipe ? "#2E6965" : "#1d4ed8"

	let cibleLabel = ""
	if (isEquipe) {
		if (d.cibleEquipe === "tous") cibleLabel = "Tous les membres"
		else if (d.cibleEquipe === "par_role") cibleLabel = `Rôle : ${d.cibleRole ?? "—"}`
		else if (d.cibleEquipe === "par_fonction") cibleLabel = `Fonction : ${d.fonctionNom ?? "—"}`
	} else {
		const assignLabel =
			d.assignationClient === "responsable_hierarchique"
				? "resp. hiérarchique"
				: "resp. opérationnel"
		cibleLabel = `Assigné au ${assignLabel}`
		if (d.filtresCount && d.filtresCount > 0) {
			cibleLabel += ` (${d.filtresCount} filtre${d.filtresCount > 1 ? "s" : ""})`
		}
	}

	return (
		<div
			className="rounded-lg border-2 px-4 py-3 shadow-sm min-w-[220px] max-w-[300px] cursor-pointer transition-all"
			style={{
				borderColor: selected ? "#6242FB" : borderColor,
				backgroundColor: bgColor,
				boxShadow: selected ? "0 0 0 3px rgba(98, 66, 251, 0.2)" : undefined,
			}}
		>
			<div className="flex items-center gap-2 mb-1.5">
				{isEquipe ? (
					<Users className="h-4 w-4" style={{ color: iconColor }} />
				) : (
					<Building2 className="h-4 w-4" style={{ color: iconColor }} />
				)}
				<span className="text-xs font-bold uppercase tracking-wide" style={{ color: iconColor }}>
					Ciblage
				</span>
				<Badge
					variant="outline"
					className="text-[9px] ml-auto"
					style={{ borderColor, color: iconColor }}
				>
					{isEquipe ? "Équipe" : "Client"}
				</Badge>
			</div>
			<p className="text-[11px] text-muted-foreground leading-tight">{cibleLabel}</p>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!w-2.5 !h-2.5"
				style={{ background: borderColor }}
			/>
		</div>
	)
}
