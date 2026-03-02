"use client"

import { ChevronDown, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
	title: string
	unreadCount: number
	isOpen: boolean
	onToggle: () => void
	onAdd?: () => void
}

export function SectionHeader({ title, unreadCount, isOpen, onToggle, onAdd }: SectionHeaderProps) {
	return (
		<div className="flex items-center justify-between px-3 py-1.5 group">
			<button
				type="button"
				onClick={onToggle}
				className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
			>
				<ChevronDown
					className={cn("h-3 w-3 transition-transform duration-200", !isOpen && "-rotate-90")}
				/>
				{title}
				{unreadCount > 0 && (
					<Badge className="h-4 min-w-4 px-1 text-[10px] bg-v7-emeraude text-white">
						{unreadCount}
					</Badge>
				)}
			</button>
			{onAdd && (
				<Button
					size="icon"
					variant="ghost"
					className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
					onClick={onAdd}
				>
					<Plus className="h-3 w-3" />
				</Button>
			)}
		</div>
	)
}
