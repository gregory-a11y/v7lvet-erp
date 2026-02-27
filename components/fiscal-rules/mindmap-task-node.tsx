"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { Badge } from "@/components/ui/badge"

export function MindmapTaskNode({ data, selected }: NodeProps) {
	const d = data as {
		nom: string
		categorie?: string
		cerfa?: string
		hasRepeat?: boolean
		repeat?: { frequence: string; moisExclus?: number[] }
	}
	const isRecurrent = d.hasRepeat || !!d.repeat

	return (
		<div
			className={`rounded-lg border bg-[#F4F5F3] px-3 py-2.5 shadow-sm min-w-[180px] max-w-[280px] cursor-pointer transition-all ${
				selected ? "border-[#6242FB] ring-2 ring-[#6242FB]/20" : "hover:shadow-md"
			}`}
		>
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-muted-foreground !w-2.5 !h-2.5"
			/>
			<div className="flex items-center gap-1.5 mb-1">
				<div className="h-2 w-2 rounded-full bg-[#2E6965]" />
				<p className="text-xs font-medium leading-tight">{d.nom}</p>
			</div>
			<div className="flex flex-wrap items-center gap-1">
				{d.categorie && (
					<Badge
						variant="outline"
						className="text-[9px] px-1.5 py-0 border-[#2E6965]/30 text-[#2E6965]"
					>
						{d.categorie}
					</Badge>
				)}
				{d.cerfa && (
					<Badge
						variant="outline"
						className="text-[9px] px-1.5 py-0 border-[#6242FB]/30 text-[#6242FB]"
					>
						{d.cerfa}
					</Badge>
				)}
				{isRecurrent && (
					<Badge variant="secondary" className="text-[9px] px-1.5 py-0">
						Récurrent
					</Badge>
				)}
			</div>
			<Handle type="source" position={Position.Bottom} className="!bg-[#2E6965] !w-2.5 !h-2.5" />
		</div>
	)
}
