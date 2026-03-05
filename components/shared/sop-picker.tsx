"use client"

import { useQuery } from "convex/react"
import { BookOpen, Check, ChevronsUpDown, X } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

interface SopPickerProps {
	value?: Id<"sops">[]
	onChange: (sopIds: Id<"sops">[]) => void
	className?: string
	size?: "sm" | "default"
}

export function SopPicker({ value = [], onChange, className, size = "default" }: SopPickerProps) {
	const [open, setOpen] = useState(false)
	const sops = useQuery(api.sops.list, {})

	const selectedSops = sops?.filter((s) => value.includes(s._id)) ?? []

	const toggleSop = (sopId: Id<"sops">) => {
		if (value.includes(sopId)) {
			onChange(value.filter((id) => id !== sopId))
		} else {
			onChange([...value, sopId])
		}
	}

	const removeSop = (sopId: Id<"sops">) => {
		onChange(value.filter((id) => id !== sopId))
	}

	return (
		<div className={cn("space-y-1.5", className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							"w-full justify-between font-normal",
							size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
							value.length === 0 && "text-muted-foreground",
						)}
					>
						<span className="flex items-center gap-2 truncate">
							<BookOpen className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
							{value.length === 0
								? "Associer des SOPs"
								: `${value.length} SOP${value.length > 1 ? "s" : ""}`}
						</span>
						<ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-72 p-0" align="start">
					<Command>
						<CommandInput placeholder="Rechercher un SOP..." />
						<CommandList>
							<CommandEmpty>Aucun SOP trouvé</CommandEmpty>
							<CommandGroup>
								{sops?.map((sop) => {
									const isSelected = value.includes(sop._id)
									return (
										<CommandItem
											key={sop._id}
											value={sop.nom}
											onSelect={() => toggleSop(sop._id)}
											className={cn("text-sm", isSelected && "bg-primary/5")}
										>
											<Check
												className={cn("mr-2 h-3.5 w-3.5", isSelected ? "opacity-100" : "opacity-0")}
											/>
											<span className="truncate">{sop.nom}</span>
											{sop.categoryNom && (
												<span className="ml-auto text-[10px] text-muted-foreground">
													{sop.categoryNom}
												</span>
											)}
										</CommandItem>
									)
								})}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{selectedSops.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{selectedSops.map((sop) => (
						<Badge
							key={sop._id}
							variant="secondary"
							className={cn("gap-1 pr-1", size === "sm" ? "text-[10px] h-5" : "text-xs h-6")}
						>
							<BookOpen className="h-2.5 w-2.5" />
							<span className="max-w-[120px] truncate">{sop.nom}</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation()
									removeSop(sop._id)
								}}
								className="ml-0.5 rounded-sm hover:bg-muted p-0.5"
							>
								<X className="h-2.5 w-2.5" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	)
}
