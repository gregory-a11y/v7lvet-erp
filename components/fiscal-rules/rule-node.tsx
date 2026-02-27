"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { Badge } from "@/components/ui/badge"

export interface RuleNodeData {
	nom: string
	description?: string
	isActive: boolean
	[key: string]: unknown
}

export function RuleNode({ data }: NodeProps) {
	const d = data as RuleNodeData
	return (
		<div className="rounded-lg border-2 border-primary bg-white px-4 py-3 shadow-md min-w-[220px]">
			<div className="flex items-center gap-2">
				<div className="h-3 w-3 rounded-full bg-primary" />
				<span className="font-heading text-sm tracking-wide">{d.nom}</span>
				<Badge variant={d.isActive ? "default" : "secondary"} className="ml-auto text-[10px]">
					{d.isActive ? "Actif" : "Inactif"}
				</Badge>
			</div>
			{d.description && <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>}
			<Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
		</div>
	)
}
