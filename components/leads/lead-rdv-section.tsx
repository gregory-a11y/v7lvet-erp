"use client"

import { Calendar, Clock, MapPin, Phone, Video } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Doc } from "@/convex/_generated/dataModel"
import { ScheduleRdvDialog } from "./schedule-rdv-dialog"

const RDV_TYPE_CONFIG: Record<string, { label: string; icon: typeof Video; color: string }> = {
	visio: { label: "Visioconférence", icon: Video, color: "text-blue-600 bg-blue-50" },
	physique: { label: "Physique", icon: MapPin, color: "text-green-600 bg-green-50" },
	telephone: { label: "Téléphone", icon: Phone, color: "text-amber-600 bg-amber-50" },
}

interface LeadRdvSectionProps {
	lead: Doc<"leads">
}

export function LeadRdvSection({ lead }: LeadRdvSectionProps) {
	const [dialogOpen, setDialogOpen] = useState(false)
	const config = lead.rdvType ? RDV_TYPE_CONFIG[lead.rdvType] : null
	const Icon = config?.icon ?? Calendar

	return (
		<>
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							Rendez-vous
						</CardTitle>
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={() => setDialogOpen(true)}
						>
							{lead.rdvDate ? "Modifier" : "Planifier"}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{lead.rdvDate ? (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								{config && (
									<Badge variant="secondary" className={`text-[10px] ${config.color}`}>
										<Icon className="h-3 w-3 mr-1" />
										{config.label}
									</Badge>
								)}
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Clock className="h-3.5 w-3.5 text-muted-foreground" />
								{new Date(lead.rdvDate).toLocaleDateString("fr-FR", {
									weekday: "long",
									day: "numeric",
									month: "long",
									year: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</div>
							{lead.rdvNotes && (
								<p className="text-xs text-muted-foreground mt-1">{lead.rdvNotes}</p>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">Aucun RDV planifié</p>
					)}
				</CardContent>
			</Card>

			<ScheduleRdvDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				leadId={lead._id}
				leadName={lead.contactNom}
				leadEmail={lead.contactEmail}
			/>
		</>
	)
}
