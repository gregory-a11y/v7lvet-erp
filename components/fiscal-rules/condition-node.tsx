"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { formatCondition } from "@/lib/fiscal-rule-fields"

export interface ConditionNodeData {
	conditions: Array<{ champ: string; operateur: string; valeur?: unknown }>
	label?: string
	[key: string]: unknown
}

export function ConditionNode({ data }: NodeProps) {
	const d = data as ConditionNodeData
	return (
		<div className="rounded-lg border-2 border-[#063238] bg-white px-4 py-3 shadow-md min-w-[200px]">
			<Handle type="target" position={Position.Top} className="!bg-[#063238] !w-3 !h-3" />
			<div className="flex items-center gap-2 mb-1">
				<div className="h-2.5 w-2.5 rounded-full bg-[#063238]" />
				<span className="text-xs font-medium text-[#063238]">Conditions (AND)</span>
			</div>
			<div className="space-y-1">
				{d.conditions.map((c, i) => (
					<p key={i} className="text-xs text-muted-foreground">
						{formatCondition(c)}
					</p>
				))}
				{d.conditions.length === 0 && (
					<p className="text-xs text-muted-foreground italic">Aucune condition</p>
				)}
			</div>
			<Handle type="source" position={Position.Bottom} className="!bg-[#063238] !w-3 !h-3" />
		</div>
	)
}
