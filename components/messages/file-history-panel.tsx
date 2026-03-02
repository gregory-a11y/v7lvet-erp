"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"
import { fr } from "date-fns/locale/fr"
import { Download, FileText, Image as ImageIcon, X } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useConversationFiles } from "@/lib/hooks/use-messaging"

interface FileHistoryPanelProps {
	conversationId: Id<"conversations"> | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

interface FileItem {
	storageId: string
	nom: string
	mimeType: string
	fileSize: number
	messageId: string
	senderId: string
	senderName: string | null
	createdAt: number
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function groupFilesByMonth(files: FileItem[]): Map<string, FileItem[]> {
	const groups = new Map<string, FileItem[]>()
	for (const file of files) {
		const key = format(new Date(file.createdAt), "MMMM yyyy", { locale: fr })
		const existing = groups.get(key) ?? []
		existing.push(file)
		groups.set(key, existing)
	}
	return groups
}

function FileRow({ file }: { file: FileItem }) {
	const fileUrl = useQuery(api.messages.getFileUrl, { storageId: file.storageId })
	const isImage = file.mimeType.startsWith("image/")

	return (
		<div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
			<div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
				{isImage ? (
					<ImageIcon className="h-4 w-4 text-muted-foreground" />
				) : (
					<FileText className="h-4 w-4 text-muted-foreground" />
				)}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm truncate">{file.nom}</p>
				<p className="text-[10px] text-muted-foreground">
					{file.senderName ?? "Inconnu"} &middot; {formatFileSize(file.fileSize)} &middot;{" "}
					{format(new Date(file.createdAt), "d MMM HH:mm", { locale: fr })}
				</p>
			</div>
			{fileUrl && (
				<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
					<a href={fileUrl} target="_blank" rel="noopener noreferrer" download={file.nom}>
						<Download className="h-3.5 w-3.5" />
					</a>
				</Button>
			)}
		</div>
	)
}

export function FileHistoryPanel({ conversationId, open, onOpenChange }: FileHistoryPanelProps) {
	const { files, isLoading } = useConversationFiles(conversationId)

	const grouped = useMemo(() => groupFilesByMonth(files as FileItem[]), [files])

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-[380px] sm:w-[420px] p-0">
				<SheetHeader className="px-4 py-3 border-b">
					<div className="flex items-center justify-between">
						<SheetTitle className="text-sm">Fichiers partagés</SheetTitle>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => onOpenChange(false)}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto p-2">
					{isLoading ? (
						<p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
					) : files.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12">
							<FileText className="h-10 w-10 text-muted-foreground/20 mb-3" />
							<p className="text-sm text-muted-foreground">Aucun fichier partagé</p>
						</div>
					) : (
						Array.from(grouped.entries()).map(([month, monthFiles]) => (
							<div key={month} className="mb-4">
								<p className="text-xs font-semibold text-muted-foreground uppercase px-3 py-1.5">
									{month}
								</p>
								<div className="space-y-0.5">
									{monthFiles.map((file) => (
										<FileRow key={`${file.messageId}-${file.storageId}`} file={file} />
									))}
								</div>
							</div>
						))
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
