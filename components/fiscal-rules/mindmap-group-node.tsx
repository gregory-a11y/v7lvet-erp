"use client"

import { Handle, type NodeProps, Position } from "@xyflow/react"

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
	IR: {
		bg: "bg-emerald-50",
		border: "border-emerald-500",
		text: "text-emerald-700",
		dot: "bg-emerald-500",
	},
	IS: { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-700", dot: "bg-blue-500" },
	TVA: {
		bg: "bg-violet-50",
		border: "border-violet-500",
		text: "text-violet-700",
		dot: "bg-violet-500",
	},
	CFE: {
		bg: "bg-amber-50",
		border: "border-amber-500",
		text: "text-amber-700",
		dot: "bg-amber-500",
	},
	CVAE: {
		bg: "bg-orange-50",
		border: "border-orange-500",
		text: "text-orange-700",
		dot: "bg-orange-500",
	},
	TAXES: {
		bg: "bg-rose-50",
		border: "border-rose-500",
		text: "text-rose-700",
		dot: "bg-rose-500",
	},
}

const DEFAULT_COLOR = {
	bg: "bg-gray-50",
	border: "border-gray-400",
	text: "text-gray-700",
	dot: "bg-gray-400",
}

export function MindmapGroupNode({ data, selected }: NodeProps) {
	const d = data as { label: string; groupe: string }
	const colors = GROUP_COLORS[d.groupe] ?? DEFAULT_COLOR

	return (
		<div
			className={`rounded-xl border-2 ${colors.bg} px-5 py-3 shadow-md min-w-[180px] cursor-pointer transition-all ${
				selected ? "border-[#6242FB] ring-2 ring-[#6242FB]/20" : `${colors.border} hover:shadow-lg`
			}`}
		>
			<Handle type="target" position={Position.Top} className={`!${colors.dot} !w-3 !h-3`} />
			<div className="flex items-center gap-2">
				<div className={`h-3 w-3 rounded-full ${colors.dot}`} />
				<span className={`font-heading text-xs font-bold uppercase tracking-wider ${colors.text}`}>
					{d.label}
				</span>
			</div>
			<Handle type="source" position={Position.Bottom} className={`!${colors.dot} !w-3 !h-3`} />
		</div>
	)
}
