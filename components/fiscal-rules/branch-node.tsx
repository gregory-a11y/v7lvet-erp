"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { formatCondition } from "@/lib/fiscal-rule-fields"

export interface BranchNodeData {
	nom: string
	conditions: Array<{ champ: string; operateur: string; valeur?: unknown }>
	[key: string]: unknown
}

export function BranchNode({ data }: NodeProps) {
	const d = data as BranchNodeData
	return (
		<div className="rounded-lg border-2 border-[#6242FB] bg-white px-4 py-3 shadow-md min-w-[200px]">
			<Handle type="target" position={Position.Top} className="!bg-[#6242FB] !w-3 !h-3" />
			<div className="flex items-center gap-2 mb-1">
				<div className="h-2.5 w-2.5 rounded-full bg-[#6242FB]" />
				<span className="text-xs font-medium text-[#6242FB]">{d.nom}</span>
			</div>
			{d.conditions.length > 0 && (
				<div className="space-y-0.5">
					{d.conditions.map((c, i) => (
						<p key={i} className="text-xs text-muted-foreground">
							{formatCondition(c)}
						</p>
					))}
				</div>
			)}
			<Handle type="source" position={Position.Bottom} className="!bg-[#6242FB] !w-3 !h-3" />
		</div>
	)
}
