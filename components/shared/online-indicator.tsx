"use client"

import { cn } from "@/lib/utils"

export function OnlineIndicator({
	isOnline,
	size = "sm",
	className,
}: {
	isOnline: boolean
	size?: "sm" | "md"
	className?: string
}) {
	return (
		<span
			className={cn(
				"block shrink-0 rounded-full border-2 border-sidebar",
				isOnline ? "bg-emerald-400" : "bg-gray-400",
				size === "sm" && "h-2.5 w-2.5",
				size === "md" && "h-3 w-3",
				className,
			)}
		/>
	)
}
