"use client"

import { CalendarIcon, Send } from "lucide-react"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import { useCreateDocumentRequest } from "@/lib/hooks/use-document-requests"

interface DocumentRequestDialogProps {
	conversationId: Id<"conversations">
	clientId: Id<"clients">
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function DocumentRequestDialog({
	conversationId,
	clientId,
	open,
	onOpenChange,
}: DocumentRequestDialogProps) {
	const createRequest = useCreateDocumentRequest()
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [dueDate, setDueDate] = useState("")
	const [creating, setCreating] = useState(false)

	const reset = useCallback(() => {
		setTitle("")
		setDescription("")
		setDueDate("")
	}, [])

	const handleSubmit = useCallback(async () => {
		if (!title.trim()) return
		setCreating(true)
		try {
			await createRequest({
				conversationId,
				clientId,
				title: title.trim(),
				description: description.trim() || undefined,
				dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
			})
			toast.success("Demande de document envoyée")
			onOpenChange(false)
			reset()
		} catch {
			toast.error("Erreur lors de la création de la demande")
		} finally {
			setCreating(false)
		}
	}, [title, description, dueDate, conversationId, clientId, createRequest, onOpenChange, reset])

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				onOpenChange(v)
				if (!v) reset()
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Demander un document</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="doc-title">Titre du document *</Label>
						<Input
							id="doc-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="ex: Bilan N-1, Relevé bancaire..."
							className="h-9 text-sm"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="doc-description">Description</Label>
						<Textarea
							id="doc-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Précisions sur le document attendu..."
							className="text-sm min-h-[80px]"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="doc-due-date">Date limite</Label>
						<div className="relative">
							<CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								id="doc-due-date"
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className="h-9 text-sm pl-8"
							/>
						</div>
					</div>

					<Button
						className="w-full bg-v7-amethyste hover:bg-v7-amethyste/90 gap-2"
						disabled={!title.trim() || creating}
						onClick={handleSubmit}
					>
						<Send className="h-4 w-4" />
						Envoyer la demande
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
