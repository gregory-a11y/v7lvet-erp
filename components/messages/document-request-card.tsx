"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { CalendarIcon, Check, Download, FileText, X } from "lucide-react"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useUpdateDocumentRequestStatus } from "@/lib/hooks/use-document-requests"
import { cn } from "@/lib/utils"

interface DocumentRequestCardProps {
	documentRequestId: Id<"documentRequests">
	isOwn: boolean
}

const statusConfig = {
	pending: { label: "En attente", color: "bg-amber-100 text-amber-800" },
	uploaded: { label: "Uploadé", color: "bg-blue-100 text-blue-800" },
	accepted: { label: "Accepté", color: "bg-green-100 text-green-800" },
	rejected: { label: "Refusé", color: "bg-red-100 text-red-800" },
} as const

export function DocumentRequestCard({ documentRequestId, isOwn }: DocumentRequestCardProps) {
	const request = useQuery(api.documentRequests.getById, { id: documentRequestId })
	const updateStatusMutation = useUpdateDocumentRequestStatus()
	const [rejectNote, setRejectNote] = useState("")
	const [showRejectInput, setShowRejectInput] = useState(false)

	const handleAccept = useCallback(async () => {
		if (!request) return
		try {
			await updateStatusMutation({ id: request._id, status: "accepted" })
			toast.success("Document accepté")
		} catch {
			toast.error("Erreur")
		}
	}, [request, updateStatusMutation])

	const handleReject = useCallback(async () => {
		if (!request) return
		try {
			await updateStatusMutation({
				id: request._id,
				status: "rejected",
				note: rejectNote.trim() || undefined,
			})
			toast.success("Document refusé")
			setShowRejectInput(false)
			setRejectNote("")
		} catch {
			toast.error("Erreur")
		}
	}, [request, rejectNote, updateStatusMutation])

	if (!request) {
		return (
			<div className="rounded-lg border bg-muted/30 p-3 max-w-xs">
				<p className="text-xs text-muted-foreground">Chargement...</p>
			</div>
		)
	}

	const statusInfo = statusConfig[request.status]

	return (
		<div
			className={cn(
				"rounded-lg border p-3 max-w-sm space-y-2",
				isOwn ? "bg-v7-emeraude/5 border-v7-emeraude/20" : "bg-muted/30",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<FileText className="h-4 w-4 text-v7-amethyste shrink-0" />
					<span className="text-sm font-medium">{request.title}</span>
				</div>
				<Badge className={cn("text-[10px] shrink-0", statusInfo.color)}>{statusInfo.label}</Badge>
			</div>

			{request.description && (
				<p className="text-xs text-muted-foreground">{request.description}</p>
			)}

			{request.dueDate && (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<CalendarIcon className="h-3 w-3" />
					<span>Échéance : {format(new Date(request.dueDate), "d MMMM yyyy", { locale: fr })}</span>
				</div>
			)}

			{/* Show attached files if uploaded */}
			{request.attachments && request.attachments.length > 0 && (
				<div className="space-y-1 pt-1 border-t">
					{request.attachments.map((att) => (
						<FileDownloadRow key={att.storageId} attachment={att} />
					))}
				</div>
			)}

			{/* Actions based on status */}
			{request.status === "uploaded" && isOwn && (
				<div className="flex gap-2 pt-1">
					<Button
						size="sm"
						className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
						onClick={handleAccept}
					>
						<Check className="h-3 w-3" />
						Accepter
					</Button>
					{showRejectInput ? (
						<div className="flex-1 flex gap-1">
							<Input
								value={rejectNote}
								onChange={(e) => setRejectNote(e.target.value)}
								placeholder="Motif..."
								className="h-7 text-xs"
							/>
							<Button
								size="sm"
								variant="destructive"
								className="h-7 text-xs"
								onClick={handleReject}
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
					) : (
						<Button
							size="sm"
							variant="outline"
							className="h-7 text-xs gap-1 text-destructive"
							onClick={() => setShowRejectInput(true)}
						>
							<X className="h-3 w-3" />
							Refuser
						</Button>
					)}
				</div>
			)}

			{request.responseNote && (
				<p className="text-xs text-muted-foreground italic border-t pt-1">
					Note : {request.responseNote}
				</p>
			)}
		</div>
	)
}

function FileDownloadRow({
	attachment,
}: {
	attachment: { storageId: string; nom: string; mimeType: string; fileSize: number }
}) {
	const fileUrl = useQuery(api.messages.getFileUrl, { storageId: attachment.storageId })

	return (
		<div className="flex items-center gap-2 text-xs">
			<FileText className="h-3 w-3 text-muted-foreground shrink-0" />
			<span className="truncate flex-1">{attachment.nom}</span>
			{fileUrl && (
				<a
					href={fileUrl}
					target="_blank"
					rel="noopener noreferrer"
					download={attachment.nom}
					className="text-v7-amethyste hover:underline shrink-0"
				>
					<Download className="h-3 w-3" />
				</a>
			)}
		</div>
	)
}
