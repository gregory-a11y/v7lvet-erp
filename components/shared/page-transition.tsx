"use client"

import { cn } from "@/lib/utils"

export function PageTransition({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return <div className={cn("min-h-full animate-fade-in", className)}>{children}</div>
}
