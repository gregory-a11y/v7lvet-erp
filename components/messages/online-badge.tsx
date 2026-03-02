"use client"

import { cn } from "@/lib/utils"

interface OnlineBadgeProps {
	isOnline: boolean
	size?: "sm" | "md"
	className?: string
}

export function OnlineBadge({ isOnline, size = "sm", className }: OnlineBadgeProps) {
	return (
		<span
			className={cn(
				"rounded-full ring-2 ring-white",
				isOnline ? "bg-green-500" : "bg-muted-foreground/30",
				size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
				className,
			)}
		/>
	)
}
