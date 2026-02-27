"use client"

import { GanttChart, List } from "lucide-react"
import { Button } from "@/components/ui/button"

export type ViewMode = "formaliste" | "gantt"

interface ViewToggleProps {
	value: ViewMode
	onChange: (mode: ViewMode) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
	return (
		<div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
			<Button
				variant="ghost"
				size="sm"
				className={
					value === "formaliste"
						? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
						: "text-muted-foreground hover:text-foreground"
				}
				onClick={() => onChange("formaliste")}
			>
				<List className="mr-1.5 h-4 w-4" />
				Liste
			</Button>
			<Button
				variant="ghost"
				size="sm"
				className={
					value === "gantt"
						? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
						: "text-muted-foreground hover:text-foreground"
				}
				onClick={() => onChange("gantt")}
			>
				<GanttChart className="mr-1.5 h-4 w-4" />
				Timeline
			</Button>
		</div>
	)
}
