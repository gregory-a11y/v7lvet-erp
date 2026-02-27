"use client"

import { useQuery } from "convex/react"
import { Download, File, FileImage, FileText, FileVideo } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"

interface Attachment {
	storageId: string
	nom: string
	mimeType: string
	fileSize: number
}

interface FileAttachmentProps {
	attachment: Attachment
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function getFileIcon(mimeType: string) {
	if (mimeType.startsWith("image/")) return FileImage
	if (mimeType.startsWith("video/")) return FileVideo
	if (mimeType.includes("pdf") || mimeType.includes("document")) return FileText
	return File
}

export function FileAttachment({ attachment }: FileAttachmentProps) {
	const url = useQuery(api.messages.getFileUrl, {
		storageId: attachment.storageId,
	})

	const isImage = attachment.mimeType.startsWith("image/")
	const Icon = getFileIcon(attachment.mimeType)

	if (isImage && url) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="block max-w-xs rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors"
			>
				<Image
					src={url}
					alt={attachment.nom}
					width={320}
					height={192}
					className="max-h-48 w-auto object-cover"
					unoptimized
				/>
				<div className="px-2 py-1 bg-muted/50 flex items-center justify-between gap-2">
					<span className="text-xs text-muted-foreground truncate">{attachment.nom}</span>
					<span className="text-[10px] text-muted-foreground shrink-0">
						{formatFileSize(attachment.fileSize)}
					</span>
				</div>
			</a>
		)
	}

	return (
		<div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 max-w-xs">
			<Icon className="h-5 w-5 text-muted-foreground shrink-0" />
			<div className="flex-1 min-w-0">
				<p className="text-sm truncate">{attachment.nom}</p>
				<p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
			</div>
			{url && (
				<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
					<a href={url} download={attachment.nom} target="_blank" rel="noopener noreferrer">
						<Download className="h-3.5 w-3.5" />
					</a>
				</Button>
			)}
		</div>
	)
}
