"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"

export function MindmapStartNode({ data, selected }: NodeProps) {
	const d = data as { label: string }
	return (
		<div
			className={`rounded-xl border-2 bg-white px-6 py-4 shadow-lg min-w-[200px] cursor-pointer transition-all ${
				selected ? "border-[#6242FB] ring-2 ring-[#6242FB]/20" : "border-primary hover:shadow-xl"
			}`}
		>
			<div className="flex items-center gap-3">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
					<svg
						className="h-4 w-4 text-white"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden="true"
					>
						<title>Système fiscal</title>
						<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
					</svg>
				</div>
				<span className="font-heading text-sm font-bold uppercase tracking-wide text-primary">
					{d.label ?? "Système Fiscal"}
				</span>
			</div>
			<Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
		</div>
	)
}
