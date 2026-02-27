"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { Badge } from "@/components/ui/badge"

export interface TaskNodeData {
	nom: string
	categorie?: string
	cerfa?: string
	hasRepeat?: boolean
	[key: string]: unknown
}

export function TaskNode({ data }: NodeProps) {
	const d = data as TaskNodeData
	return (
		<div className="rounded-lg border bg-[#F4F5F3] px-3 py-2 shadow-sm min-w-[180px] max-w-[280px]">
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-muted-foreground !w-2.5 !h-2.5"
			/>
			<div className="flex items-start gap-2">
				<div className="flex-1">
					<p className="text-xs font-medium leading-tight">{d.nom}</p>
					<div className="flex items-center gap-1 mt-1">
						{d.categorie && (
							<Badge variant="outline" className="text-[9px] px-1 py-0">
								{d.categorie}
							</Badge>
						)}
						{d.cerfa && (
							<Badge variant="outline" className="text-[9px] px-1 py-0">
								{d.cerfa}
							</Badge>
						)}
						{d.hasRepeat && (
							<Badge variant="secondary" className="text-[9px] px-1 py-0">
								Récurrent
							</Badge>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
