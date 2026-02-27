"use client"

import { useMutation, useQuery } from "convex/react"
import { FileText, Trash2, Upload, X } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/convex/_generated/api"

export type Attachment = {
	storageId: string
	nom: string
	mimeType: string
	fileSize: number
}

interface PdfAttachmentsProps {
	attachments: Attachment[]
	onChange: (attachments: Attachment[]) => void
	editable?: boolean
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function PdfViewer({ storageId, nom }: { storageId: string; nom: string }) {
	const fileUrl = useQuery(api.sops.getFileUrl, { storageId })
	if (!fileUrl)
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				Chargement…
			</div>
		)
	return <iframe src={fileUrl} className="h-full w-full" title={nom} />
}

export function PdfAttachments({ attachments, onChange, editable = true }: PdfAttachmentsProps) {
	const generateUploadUrl = useMutation(api.sops.generateUploadUrl)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [uploading, setUploading] = useState(false)
	const [viewingPdf, setViewingPdf] = useState<Attachment | null>(null)

	async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files
		if (!files?.length) return
		setUploading(true)
		try {
			const newAttachments: Attachment[] = []
			for (const file of Array.from(files)) {
				if (file.type !== "application/pdf") {
					toast.error(`${file.name} n'est pas un PDF`)
					continue
				}
				const uploadUrl = await generateUploadUrl()
				const res = await fetch(uploadUrl, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file,
				})
				const { storageId } = await res.json()
				newAttachments.push({
					storageId,
					nom: file.name,
					mimeType: file.type,
					fileSize: file.size,
				})
			}
			onChange([...attachments, ...newAttachments])
			if (newAttachments.length > 0) {
				toast.success(`${newAttachments.length} fichier(s) uploadé(s)`)
			}
		} catch {
			toast.error("Erreur lors de l'upload")
		} finally {
			setUploading(false)
			if (fileInputRef.current) fileInputRef.current.value = ""
		}
	}

	function handleRemove(index: number) {
		const updated = attachments.filter((_, i) => i !== index)
		onChange(updated)
	}

	return (
		<div className="space-y-3">
			{editable && (
				<div>
					<input
						ref={fileInputRef}
						type="file"
						accept="application/pdf"
						multiple
						onChange={handleUpload}
						className="hidden"
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						disabled={uploading}
					>
						<Upload className="mr-2 h-4 w-4" />
						{uploading ? "Upload en cours…" : "Ajouter un PDF"}
					</Button>
				</div>
			)}
			{attachments.length > 0 && (
				<div className="space-y-2">
					{attachments.map((att, i) => (
						<div
							key={att.storageId}
							className="flex items-center gap-3 rounded-md border p-3 bg-muted/30"
						>
							<FileText className="h-5 w-5 shrink-0 text-destructive" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">{att.nom}</p>
								<p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>
							</div>
							<div className="flex gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7"
									onClick={() => setViewingPdf(att)}
								>
									Voir
								</Button>
								{editable && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 text-destructive"
										onClick={() => handleRemove(i)}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
			<Dialog open={!!viewingPdf} onOpenChange={(open) => !open && setViewingPdf(null)}>
				<DialogContent className="max-w-4xl h-[80vh]">
					<DialogHeader>
						<DialogTitle className="flex items-center justify-between">
							{viewingPdf?.nom}
							<Button variant="ghost" size="sm" onClick={() => setViewingPdf(null)}>
								<X className="h-4 w-4" />
							</Button>
						</DialogTitle>
					</DialogHeader>
					<div className="flex-1 h-full">
						{viewingPdf && <PdfViewer storageId={viewingPdf.storageId} nom={viewingPdf.nom} />}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
