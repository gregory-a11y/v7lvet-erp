"use client"

import { useMutation } from "convex/react"
import { format } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { AlignLeft, Calendar, MapPin, Pencil, Trash2, Users, Video } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUserContext } from "@/lib/contexts/current-user"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

interface CalendarEvent {
	_id: Id<"calendarEvents">
	title: string
	description?: string
	location?: string
	videoUrl?: string
	startAt: number
	endAt: number
	allDay: boolean
	source: "internal" | "google" | "microsoft"
	createdById: string
	participants?: {
		type: "team" | "client" | "external"
		userId?: string
		email?: string
		name?: string
		status: "pending" | "accepted" | "declined" | "tentative"
	}[]
}

interface EventDetailDialogProps {
	event: CalendarEvent | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onEdit?: (event: CalendarEvent) => void
}

const STATUS_LABELS: Record<string, string> = {
	pending: "En attente",
	accepted: "Accepté",
	declined: "Décliné",
	tentative: "Peut-être",
}

const STATUS_COLORS: Record<string, string> = {
	pending: "bg-amber-50 text-amber-700",
	accepted: "bg-emerald-50 text-emerald-700",
	declined: "bg-red-50 text-red-700",
	tentative: "bg-sky-50 text-sky-700",
}

function getVideoLabel(url: string): string {
	if (url.includes("teams.microsoft")) return "Rejoindre la réunion Teams"
	if (url.includes("meet.google")) return "Rejoindre Google Meet"
	return "Rejoindre la réunion"
}

function stripHtml(text: string): string {
	if (!text.includes("<")) return text
	return text
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<\/div>/gi, "\n")
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

export function EventDetailDialog({ event, open, onOpenChange, onEdit }: EventDetailDialogProps) {
	const { user, isAdmin } = useCurrentUserContext()
	const { getMemberName } = useTeamMembers()
	const deleteEvent = useMutation(api.calendar.deleteEvent)
	const [deleting, setDeleting] = useState(false)

	const [confirmDelete, setConfirmDelete] = useState(false)

	if (!event) return null

	const userId = user?.id
	const isCreator = userId === event.createdById
	const canModify = isCreator || isAdmin

	const handleDelete = async () => {
		if (!confirmDelete) {
			setConfirmDelete(true)
			return
		}
		setDeleting(true)
		try {
			await deleteEvent({ id: event._id })
			toast.success("Événement supprimé")
			onOpenChange(false)
		} catch {
			toast.error("Erreur lors de la suppression")
		} finally {
			setDeleting(false)
			setConfirmDelete(false)
		}
	}

	const formatTime = (ts: number) => format(new Date(ts), "HH:mm", { locale: fr })
	const formatDate = (ts: number) => format(new Date(ts), "EEEE d MMMM yyyy", { locale: fr })

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				setConfirmDelete(false)
				onOpenChange(v)
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-base">{event.title}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex items-start gap-3 text-sm">
						<Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
						<div>
							<p className="capitalize">{formatDate(event.startAt)}</p>
							{!event.allDay && (
								<p className="text-muted-foreground">
									{formatTime(event.startAt)} — {formatTime(event.endAt)}
								</p>
							)}
							{event.allDay && <p className="text-muted-foreground">Toute la journée</p>}
						</div>
					</div>

					{event.location && (
						<div className="flex items-start gap-3 text-sm">
							<MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
							<p>{event.location}</p>
						</div>
					)}

					{event.videoUrl && /^https?:\/\//i.test(event.videoUrl) && (
						<div className="flex items-start gap-3 text-sm min-w-0">
							<Video className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
							<a
								href={event.videoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-v7-amethyste hover:underline"
							>
								{getVideoLabel(event.videoUrl)}
							</a>
						</div>
					)}

					{event.description && (
						<div className="flex items-start gap-3 text-sm">
							<AlignLeft className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
							<p className="text-muted-foreground whitespace-pre-wrap">{stripHtml(event.description)}</p>
						</div>
					)}

					{event.participants && event.participants.length > 0 && (
						<div className="flex items-start gap-3 text-sm">
							<Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
							<div className="space-y-1.5">
								{event.participants.map((p, i) => (
									<div key={`${p.userId ?? p.email}-${i}`} className="flex items-center gap-2">
										<span>
											{p.type === "team" && p.userId
												? getMemberName(p.userId)
												: (p.name ?? p.email ?? "—")}
										</span>
										<Badge
											variant="secondary"
											className={`text-[10px] ${STATUS_COLORS[p.status] ?? ""}`}
										>
											{STATUS_LABELS[p.status] ?? p.status}
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="flex items-center gap-1.5 pt-2">
						<Badge variant="outline" className="text-[10px]">
							{event.source === "internal"
								? "Interne"
								: event.source === "google"
									? "Google"
									: "Microsoft"}
						</Badge>
						<span className="text-[10px] text-muted-foreground">
							Créé par {getMemberName(event.createdById)}
						</span>
					</div>

					{canModify && (
						<div className="flex justify-end gap-2 pt-2 border-t">
							{onEdit && (
								<Button variant="outline" size="sm" onClick={() => onEdit(event)}>
									<Pencil className="h-3.5 w-3.5 mr-1" />
									Modifier
								</Button>
							)}
							{confirmDelete ? (
								<>
									<Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
										Annuler
									</Button>
									<Button
										variant="destructive"
										size="sm"
										disabled={deleting}
										onClick={handleDelete}
									>
										<Trash2 className="h-3.5 w-3.5 mr-1" />
										{deleting ? "Suppression..." : "Confirmer"}
									</Button>
								</>
							) : (
								<Button variant="destructive" size="sm" onClick={handleDelete}>
									<Trash2 className="h-3.5 w-3.5 mr-1" />
									Supprimer
								</Button>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
