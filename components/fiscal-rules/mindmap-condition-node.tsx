"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"
import { formatCondition } from "@/lib/fiscal-rule-fields"

export function MindmapConditionNode({ data, selected }: NodeProps) {
	const d = data as { champ: string; operateur: string; valeur?: unknown; label?: string }
	const conditionText = d.label ?? formatCondition(d)

	return (
		<div
			className={`relative rounded-lg border-2 bg-white px-4 py-3 shadow-md min-w-[200px] max-w-[300px] cursor-pointer transition-all ${
				selected ? "border-[#6242FB] ring-2 ring-[#6242FB]/20" : "border-[#063238] hover:shadow-lg"
			}`}
		>
			<Handle type="target" position={Position.Top} className="!bg-[#063238] !w-3 !h-3" />

			<div className="flex items-center gap-2">
				<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#063238]">
					<span className="text-[9px] font-bold text-white">SI</span>
				</div>
				<p className="text-xs font-medium text-[#063238] leading-tight">{conditionText}</p>
			</div>

			{/* OUI handle */}
			<Handle
				type="source"
				position={Position.Left}
				id="oui"
				className="!bg-emerald-500 !w-3 !h-3"
			/>
			<span className="absolute -left-1 bottom-[-18px] text-[9px] font-bold text-emerald-600">
				OUI
			</span>

			{/* NON handle */}
			<Handle type="source" position={Position.Right} id="non" className="!bg-red-400 !w-3 !h-3" />
			<span className="absolute -right-2 bottom-[-18px] text-[9px] font-bold text-red-500">
				NON
			</span>
		</div>
	)
}
