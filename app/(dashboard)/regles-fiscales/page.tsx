"use client"

import dynamic from "next/dynamic"

const MindmapCanvas = dynamic(
	() => import("@/components/fiscal-rules/mindmap-canvas").then((m) => m.MindmapCanvas),
	{ ssr: false },
)

export default function ReglesFiscalesPage() {
	return (
		<div className="h-[calc(100vh-64px)]">
			<MindmapCanvas />
		</div>
	)
}
