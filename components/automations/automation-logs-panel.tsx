"use client"

import { AlertTriangle, CheckCircle, Clock, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Id } from "@/convex/_generated/dataModel"
import { useTaskAutomationLogs } from "@/lib/hooks/use-task-automations"

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function formatTimeAgo(ts: number): string {
	const diff = Date.now() - ts
	const minutes = Math.floor(diff / 60000)
	if (minutes < 1) return "à l'instant"
	if (minutes < 60) return `il y a ${minutes} min`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `il y a ${hours}h`
	const days = Math.floor(hours / 24)
	if (days < 7) return `il y a ${days}j`
	return formatDate(ts)
}

export function AutomationLogsPanel({ automationId }: { automationId: Id<"taskAutomations"> }) {
	const logs = useTaskAutomationLogs(automationId)

	return (
		<div className="border-t bg-background">
			<div className="flex items-center gap-2 px-4 py-2.5 border-b">
				<History className="h-4 w-4 text-muted-foreground" />
				<h3 className="text-sm font-medium">Historique d'exécution</h3>
				{logs && (
					<Badge variant="secondary" className="text-[10px] ml-auto">
						{logs.length} exécution{logs.length > 1 ? "s" : ""}
					</Badge>
				)}
			</div>

			<ScrollArea className="h-[200px]">
				{logs === undefined ? (
					<div className="flex items-center justify-center h-full text-sm text-muted-foreground">
						<Clock className="h-4 w-4 mr-2 animate-spin" />
						Chargement...
					</div>
				) : logs.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground py-8">
						<History className="h-8 w-8 mb-2 opacity-30" />
						<p>Aucune exécution enregistrée</p>
						<p className="text-xs mt-1">Les logs apparaîtront après la première exécution</p>
					</div>
				) : (
					<div className="divide-y">
						{logs.map((log) => {
							const hasErrors = log.errors && log.errors.length > 0
							return (
								<div key={log._id} className="px-4 py-2.5 hover:bg-muted/50 transition-colors">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2 min-w-0">
											{hasErrors ? (
												<AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
											) : (
												<CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
											)}
											<span className="text-xs font-medium">
												{log.todosCreated} tâche{log.todosCreated > 1 ? "s" : ""} créée
												{log.todosCreated > 1 ? "s" : ""}
											</span>
											{hasErrors && (
												<Badge
													variant="outline"
													className="text-[9px] text-amber-600 border-amber-300"
												>
													{log.errors!.length} erreur
													{log.errors!.length > 1 ? "s" : ""}
												</Badge>
											)}
										</div>
										<span
											className="text-[11px] text-muted-foreground shrink-0"
											title={formatDate(log.executedAt)}
										>
											{formatTimeAgo(log.executedAt)}
										</span>
									</div>
									{hasErrors && (
										<div className="mt-1.5 ml-5.5 space-y-0.5">
											{log.errors!.slice(0, 3).map((err, i) => (
												<p
													key={`${log._id}-err-${i}`}
													className="text-[11px] text-amber-600 truncate"
												>
													{err}
												</p>
											))}
											{log.errors!.length > 3 && (
												<p className="text-[10px] text-muted-foreground">
													+{log.errors!.length - 3} autres erreurs
												</p>
											)}
										</div>
									)}
								</div>
							)
						})}
					</div>
				)}
			</ScrollArea>
		</div>
	)
}
