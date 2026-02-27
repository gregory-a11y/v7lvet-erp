"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"

export function MindmapNothingNode({ selected }: NodeProps) {
	return (
		<div
			className={`rounded-lg border border-dashed bg-gray-50 px-4 py-2.5 shadow-sm min-w-[140px] cursor-pointer transition-all ${
				selected
					? "border-[#6242FB] ring-2 ring-[#6242FB]/20"
					: "border-gray-300 hover:border-gray-400"
			}`}
		>
			<Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5" />
			<p className="text-xs italic text-muted-foreground text-center">Rien à faire</p>
		</div>
	)
}
