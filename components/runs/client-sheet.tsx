"use client"

import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { AlertCircle, ArrowRight, CheckCircle2, Clock, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { STATUS_LABELS } from "@/lib/constants"

const STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-100 text-gray-800",
	en_cours: "bg-emerald-100 text-emerald-800",
	en_attente: "bg-amber-100 text-amber-800",
	termine: "bg-green-100 text-green-800",
}

interface ClientSheetProps {
	clientId: Id<"clients"> | null
	onClose: () => void
}

export function ClientSheet({ clientId, onClose }: ClientSheetProps) {
	const router = useRouter()
	const runs = useQuery(api.runs.listByClient, clientId ? { clientId } : "skip")
	const client = useQuery(api.clients.getById, clientId ? { id: clientId } : "skip")
	const updateTaskStatus = useMutation(api.taches.updateStatus)

	return (
		<Sheet open={!!clientId} onOpenChange={(open) => !open && onClose()}>
			<SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{client?.raisonSociale ?? "Client"}</SheetTitle>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					{runs?.map((run) => {
						const pct =
							run.tachesTotal > 0 ? Math.round((run.tachesDone / run.tachesTotal) * 100) : 0
						return (
							<div key={run._id} className="rounded-lg border p-4 space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="font-medium">Exercice {run.exercice}</span>
										<Badge variant="secondary" className={STATUS_COLORS[run.status] ?? ""}>
											{STATUS_LABELS[run.status] ?? run.status}
										</Badge>
									</div>
									<Button variant="ghost" size="sm" onClick={() => router.push(`/runs/${run._id}`)}>
										Détail
										<ArrowRight className="ml-1 h-3.5 w-3.5" />
									</Button>
								</div>

								{/* Progress bar */}
								<div className="flex items-center gap-2">
									<div className="h-2 flex-1 rounded-full bg-gray-200">
										<div
											className="h-2 rounded-full bg-primary transition-all"
											style={{ width: `${pct}%` }}
										/>
									</div>
									<span className="text-xs text-muted-foreground whitespace-nowrap">
										{run.tachesDone}/{run.tachesTotal} ({pct}%)
									</span>
								</div>

								{/* Tasks list */}
								{run.taches && run.taches.length > 0 && (
									<div className="space-y-1.5">
										{run.taches.map((tache) => {
											const isOverdue =
												tache.dateEcheance &&
												tache.dateEcheance < Date.now() &&
												tache.status !== "termine"
											return (
												<div
													key={tache._id}
													className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
												>
													<button
														type="button"
														onClick={async (e) => {
															e.stopPropagation()
															if (
																tache.status === "en_verification" ||
																tache.status === "en_revision"
															) {
																return
															}
															try {
																await updateTaskStatus({
																	id: tache._id,
																	status: tache.status === "termine" ? "a_faire" : "termine",
																})
															} catch (err: unknown) {
																const msg =
																	err instanceof ConvexError
																		? (err.data as string)
																		: "Erreur lors de la mise à jour"
																toast.error(msg)
															}
														}}
														className={`shrink-0 transition-transform ${
															tache.status === "en_verification" || tache.status === "en_revision"
																? "cursor-default"
																: "cursor-pointer hover:scale-125"
														}`}
														title={
															tache.status === "termine"
																? "Marquer non terminé"
																: tache.status === "en_verification"
																	? "En attente de validation"
																	: tache.status === "en_revision"
																		? "Non validée — à réviser"
																		: "Marquer terminé"
														}
													>
														{tache.status === "termine" ? (
															<CheckCircle2 className="h-4 w-4 text-green-500" />
														) : tache.status === "en_verification" ? (
															<ShieldCheck className="h-4 w-4 text-amber-500" />
														) : tache.status === "en_revision" ? (
															<AlertCircle className="h-4 w-4 text-red-500" />
														) : isOverdue ? (
															<AlertCircle className="h-4 w-4 text-red-500" />
														) : (
															<Clock className="h-4 w-4 text-muted-foreground" />
														)}
													</button>
													<span className="flex-1 truncate">{tache.nom}</span>
													{tache.cerfa && (
														<span className="text-xs text-muted-foreground">{tache.cerfa}</span>
													)}
													{tache.dateEcheance && (
														<span
															className={`text-xs whitespace-nowrap ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}
														>
															{new Date(tache.dateEcheance).toLocaleDateString("fr-FR", {
																day: "2-digit",
																month: "short",
															})}
														</span>
													)}
													{tache.categorie && (
														<Badge variant="outline" className="text-[10px] px-1.5 py-0">
															{tache.categorie}
														</Badge>
													)}
												</div>
											)
										})}
									</div>
								)}
							</div>
						)
					})}

					{runs && runs.length === 0 && (
						<p className="text-center text-sm text-muted-foreground py-8">
							Aucun run pour ce client.
						</p>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
