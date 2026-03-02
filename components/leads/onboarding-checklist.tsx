"use client"

import { Check, Circle, Loader2, User } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { Id } from "@/convex/_generated/dataModel"
import { useOnboardingTasks, useUpdateOnboardingTask } from "@/lib/hooks/use-onboarding"

const STATUT_CONFIG = {
	a_faire: { label: "À faire", icon: Circle, color: "text-gray-500" },
	en_cours: { label: "En cours", icon: Loader2, color: "text-blue-500" },
	termine: { label: "Terminé", icon: Check, color: "text-green-500" },
}

interface OnboardingChecklistProps {
	leadId: Id<"leads">
	teamMembers?: Array<{ userId: string; nom?: string }>
}

export function OnboardingChecklist({ leadId, teamMembers }: OnboardingChecklistProps) {
	const tasks = useOnboardingTasks(leadId)
	const updateTask = useUpdateOnboardingTask()

	if (!tasks) return null
	if (tasks.length === 0) return null

	const completed = tasks.filter((t) => t.statut === "termine").length
	const progress = Math.round((completed / tasks.length) * 100)

	const handleToggle = async (taskId: Id<"onboardingTasks">, currentStatut: string) => {
		const newStatut = currentStatut === "termine" ? "a_faire" : "termine"
		try {
			await updateTask({ id: taskId, statut: newStatut })
		} catch (err: any) {
			toast.error(err.message)
		}
	}

	const handleAssign = async (taskId: Id<"onboardingTasks">, assigneId: string) => {
		try {
			await updateTask({ id: taskId, assigneId: assigneId === "none" ? undefined : assigneId })
		} catch (err: any) {
			toast.error(err.message)
		}
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">Onboarding</CardTitle>
					<Badge variant="secondary" className="text-[10px]">
						{completed}/{tasks.length} — {progress}%
					</Badge>
				</div>
				{/* Progress bar */}
				<div className="h-1.5 w-full rounded-full bg-muted mt-2">
					<div
						className="h-full rounded-full bg-v7-emeraude transition-all"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</CardHeader>
			<CardContent className="space-y-1">
				{tasks.map((task) => {
					const config = STATUT_CONFIG[task.statut]
					const Icon = config.icon
					return (
						<div
							key={task._id}
							className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/40 transition-colors"
						>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 shrink-0"
								onClick={() => handleToggle(task._id, task.statut)}
							>
								<Icon className={`h-4 w-4 ${config.color}`} />
							</Button>
							<div className="flex-1 min-w-0">
								<p
									className={`text-sm ${
										task.statut === "termine" ? "line-through text-muted-foreground" : ""
									}`}
								>
									{task.nom}
								</p>
								{task.description && (
									<p className="text-[11px] text-muted-foreground truncate">{task.description}</p>
								)}
							</div>
							{/* Assign */}
							<Select
								value={task.assigneId ?? "none"}
								onValueChange={(v) => handleAssign(task._id, v)}
							>
								<SelectTrigger className="h-6 w-[100px] text-[10px] border-none bg-transparent">
									<User className="h-3 w-3 mr-1" />
									<SelectValue placeholder="—" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Non assigné</SelectItem>
									{teamMembers?.map((m) => (
										<SelectItem key={m.userId} value={m.userId}>
											{m.nom?.split(" ")[0] ?? m.userId}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)
				})}
			</CardContent>
		</Card>
	)
}
