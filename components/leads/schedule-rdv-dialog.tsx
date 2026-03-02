"use client"

import { format } from "date-fns"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import { useScheduleRdv } from "@/lib/hooks/use-leads"

interface ScheduleRdvDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	leadId: Id<"leads">
	leadName: string
	leadEmail?: string
}

export function ScheduleRdvDialog({
	open,
	onOpenChange,
	leadId,
	leadName,
	leadEmail,
}: ScheduleRdvDialogProps) {
	const scheduleRdv = useScheduleRdv()
	const [rdvType, setRdvType] = useState<string>("visio")
	const [rdvDate, setRdvDate] = useState("")
	const [rdvTime, setRdvTime] = useState("10:00")
	const [rdvNotes, setRdvNotes] = useState("")
	const [sendLink, setSendLink] = useState(false)
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit = async () => {
		if (!rdvDate || !rdvTime) {
			toast.error("Date et heure requises")
			return
		}

		setSubmitting(true)
		try {
			const dateTime = new Date(`${rdvDate}T${rdvTime}:00`)
			await scheduleRdv({
				id: leadId,
				rdvType,
				rdvDate: dateTime.getTime(),
				rdvNotes: rdvNotes || undefined,
			})
			toast.success("RDV planifié avec succès")
			if (sendLink && leadEmail) {
				toast.info("L'envoi du lien visio sera effectué à la création de l'événement calendrier")
			}
			onOpenChange(false)
			setRdvDate("")
			setRdvTime("10:00")
			setRdvNotes("")
			setSendLink(false)
		} catch (err: any) {
			toast.error(err.message ?? "Erreur lors de la planification")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Planifier un RDV</DialogTitle>
					<DialogDescription>RDV avec {leadName}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>Type de RDV</Label>
						<Select value={rdvType} onValueChange={setRdvType}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="visio">Visioconférence</SelectItem>
								<SelectItem value="physique">Physique</SelectItem>
								<SelectItem value="telephone">Téléphone</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label>Date</Label>
							<Input
								type="date"
								value={rdvDate}
								onChange={(e) => setRdvDate(e.target.value)}
								min={format(new Date(), "yyyy-MM-dd")}
							/>
						</div>
						<div className="space-y-2">
							<Label>Heure</Label>
							<Input type="time" value={rdvTime} onChange={(e) => setRdvTime(e.target.value)} />
						</div>
					</div>

					<div className="space-y-2">
						<Label>Notes</Label>
						<Textarea
							value={rdvNotes}
							onChange={(e) => setRdvNotes(e.target.value)}
							placeholder="Notes pour le RDV..."
							rows={2}
						/>
					</div>

					{rdvType === "visio" && leadEmail && (
						<div className="flex items-center gap-2 text-sm">
							<Checkbox
								id="send-link"
								checked={sendLink}
								onCheckedChange={(c) => setSendLink(!!c)}
							/>
							<Label htmlFor="send-link" className="cursor-pointer font-normal">
								Envoyer le lien de visio par email à {leadEmail}
							</Label>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Annuler
					</Button>
					<Button onClick={handleSubmit} disabled={submitting || !rdvDate}>
						{submitting ? "Planification..." : "Planifier"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
