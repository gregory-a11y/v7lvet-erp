"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Video } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { type Participant, ParticipantPicker } from "@/components/calendar/participant-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useCreateEvent } from "@/lib/hooks/use-calendar"

const schema = z
	.object({
		title: z.string().min(1, "Le titre est requis"),
		startDate: z.string().min(1, "La date de début est requise"),
		startTime: z.string(),
		endDate: z.string().min(1, "La date de fin est requise"),
		endTime: z.string(),
		allDay: z.boolean(),
		location: z.string(),
		videoUrl: z.string(),
		description: z.string(),
	})
	.refine(
		(data) => {
			if (data.allDay) return true
			const start = new Date(`${data.startDate}T${data.startTime}`).getTime()
			const end = new Date(`${data.endDate}T${data.endTime}`).getTime()
			return end > start
		},
		{
			message: "La date de fin doit être après la date de début",
			path: ["endDate"],
		},
	)

type FormValues = z.infer<typeof schema>

interface NewEventDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	defaultDate?: Date
}

export function NewEventDialog({ open, onOpenChange, defaultDate }: NewEventDialogProps) {
	const createEvent = useCreateEvent()

	const today = defaultDate ?? new Date()
	const todayStr = format(today, "yyyy-MM-dd")

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			title: "",
			startDate: todayStr,
			startTime: "09:00",
			endDate: todayStr,
			endTime: "10:00",
			allDay: false,
			location: "",
			videoUrl: "",
			description: "",
		},
	})

	const [participants, setParticipants] = useState<Participant[]>([])
	const allDay = form.watch("allDay")

	// Reset form when dialog opens or default date changes
	useEffect(() => {
		if (open) {
			const d = defaultDate ?? new Date()
			const dateStr = format(d, "yyyy-MM-dd")
			form.reset({
				title: "",
				startDate: dateStr,
				startTime: "09:00",
				endDate: dateStr,
				endTime: "10:00",
				allDay: false,
				location: "",
				videoUrl: "",
				description: "",
			})
			setParticipants([])
		}
	}, [open, defaultDate, form])

	const onSubmit = async (data: FormValues) => {
		let startAt: number
		let endAt: number

		if (data.allDay) {
			startAt = new Date(`${data.startDate}T00:00:00`).getTime()
			endAt = new Date(`${data.endDate}T23:59:59`).getTime()
		} else {
			startAt = new Date(`${data.startDate}T${data.startTime}`).getTime()
			endAt = new Date(`${data.endDate}T${data.endTime}`).getTime()
		}

		await createEvent({
			title: data.title,
			startAt,
			endAt,
			allDay: data.allDay,
			location: data.location || undefined,
			videoUrl: data.videoUrl || undefined,
			description: data.description || undefined,
			participants:
				participants.length > 0
					? participants.map((p) => ({
							type: p.type,
							userId: p.userId,
							email: p.email,
							name: p.name,
							status: p.status,
						}))
					: undefined,
		})

		form.reset()
		setParticipants([])
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-base">Nouvel événement</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Titre</FormLabel>
									<FormControl>
										<Input placeholder="Titre de l'événement" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="allDay"
							render={({ field }) => (
								<FormItem className="flex items-center gap-3">
									<FormControl>
										<Switch checked={field.value} onCheckedChange={field.onChange} />
									</FormControl>
									<FormLabel className="!mt-0 text-sm">Toute la journée</FormLabel>
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-3">
							<FormField
								control={form.control}
								name="startDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Début</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{!allDay && (
								<FormField
									control={form.control}
									name="startTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Heure début</FormLabel>
											<FormControl>
												<Input type="time" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
							)}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<FormField
								control={form.control}
								name="endDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Fin</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{!allDay && (
								<FormField
									control={form.control}
									name="endTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Heure fin</FormLabel>
											<FormControl>
												<Input type="time" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
							)}
						</div>

						<FormField
							control={form.control}
							name="location"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Lieu</FormLabel>
									<FormControl>
										<Input placeholder="Lieu (optionnel)" {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="videoUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-1.5">
										<Video className="h-3.5 w-3.5" />
										Lien visio
									</FormLabel>
									<FormControl>
										<Input placeholder="https://meet.google.com/... (optionnel)" {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea placeholder="Description (optionnel)" rows={3} {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						<div>
							<p className="text-sm font-medium mb-2">Participants</p>
							<ParticipantPicker participants={participants} onChange={setParticipants} />
						</div>

						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								Annuler
							</Button>
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting ? "Création..." : "Créer"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
