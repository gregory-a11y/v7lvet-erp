"use client"

import { useMutation } from "convex/react"
import { Upload, X } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { DocCategoryManager } from "./doc-category-manager"

function formatFileSize(bytes: number | undefined): string {
	if (!bytes) return "—"
	if (bytes < 1024) return `${bytes} o`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

interface UploadCabinetDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function UploadCabinetDialog({ open, onOpenChange }: UploadCabinetDialogProps) {
	const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
	const createDocument = useMutation(api.documents.create)

	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [selectedFiles, setSelectedFiles] = useState<File[]>([])
	const [nom, setNom] = useState("")
	const [description, setDescription] = useState("")
	const [categorieId, setCategorieId] = useState<Id<"documentCategories"> | undefined>()
	const fileInputRef = useRef<HTMLInputElement>(null)

	function reset() {
		setSelectedFiles([])
		setNom("")
		setDescription("")
		setCategorieId(undefined)
		setUploadProgress(0)
	}

	function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files
		if (!files || files.length === 0) return
		const newFiles = Array.from(files)
		setSelectedFiles((prev) => [...prev, ...newFiles])
		if (!nom && newFiles.length > 0) {
			setNom(newFiles[0].name.replace(/\.[^.]+$/, ""))
		}
		// Reset input so the same files can be re-selected
		e.target.value = ""
	}

	function removeFile(index: number) {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
	}

	async function handleUpload(e: React.FormEvent) {
		e.preventDefault()
		if (selectedFiles.length === 0) return
		setUploading(true)
		setUploadProgress(5)

		try {
			const totalFiles = selectedFiles.length
			const firstFile = selectedFiles[0]

			// Upload first file as the main storageId
			const firstUrl = await generateUploadUrl()
			const firstRes = await fetch(firstUrl, {
				method: "POST",
				headers: { "Content-Type": firstFile.type },
				body: firstFile,
			})
			if (!firstRes.ok) throw new Error("Échec de l'upload")
			const { storageId: mainStorageId } = await firstRes.json()
			setUploadProgress(Math.round((1 / totalFiles) * 80))

			// Upload additional files
			const additionalFiles: {
				storageId: string
				nom: string
				mimeType?: string
				fileSize?: number
				uploadedAt: number
			}[] = []

			for (let i = 1; i < selectedFiles.length; i++) {
				const file = selectedFiles[i]
				const url = await generateUploadUrl()
				const res = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file,
				})
				if (!res.ok) throw new Error(`Échec de l'upload pour ${file.name}`)
				const { storageId } = await res.json()
				additionalFiles.push({
					storageId,
					nom: file.name,
					mimeType: file.type || undefined,
					fileSize: file.size,
					uploadedAt: Date.now(),
				})
				setUploadProgress(Math.round(((i + 1) / totalFiles) * 80))
			}

			setUploadProgress(85)

			await createDocument({
				nom: nom || firstFile.name,
				description: description || undefined,
				storageId: mainStorageId,
				mimeType: firstFile.type || undefined,
				fileSize: firstFile.size,
				categorieId,
				files:
					additionalFiles.length > 0
						? [
								{
									storageId: mainStorageId,
									nom: firstFile.name,
									mimeType: firstFile.type || undefined,
									fileSize: firstFile.size,
									uploadedAt: Date.now(),
								},
								...additionalFiles,
							]
						: undefined,
			})
			setUploadProgress(100)
			toast.success(
				totalFiles === 1
					? "Document cabinet ajouté"
					: `Document cabinet ajouté (${totalFiles} fichiers)`,
			)
			onOpenChange(false)
			reset()
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de l'upload")
		} finally {
			setUploading(false)
			setUploadProgress(0)
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(val) => {
				onOpenChange(val)
				if (!val) reset()
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Ajouter un document cabinet</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleUpload} className="space-y-4">
					<div>
						<Label>Fichier(s) *</Label>
						<button
							type="button"
							className="mt-1 w-full border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
							onClick={() => fileInputRef.current?.click()}
						>
							<Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
							<p className="text-sm text-muted-foreground">
								Cliquez pour sélectionner un ou plusieurs fichiers
							</p>
						</button>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							className="hidden"
							onChange={handleFileSelect}
						/>
					</div>

					{selectedFiles.length > 0 && (
						<div className="space-y-1.5 max-h-40 overflow-y-auto">
							{selectedFiles.map((file, i) => (
								<div
									key={`${file.name}-${file.size}-${i}`}
									className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
								>
									<div className="min-w-0 flex-1">
										<p className="font-medium truncate">{file.name}</p>
										<p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
										onClick={() => removeFile(i)}
									>
										<X className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}
						</div>
					)}

					<div>
						<Label htmlFor="cabinet-doc-nom">Nom du document *</Label>
						<Input
							id="cabinet-doc-nom"
							value={nom}
							onChange={(e) => setNom(e.target.value)}
							placeholder="Ex : Plaquette commerciale"
						/>
					</div>
					<div>
						<Label>Catégorie</Label>
						<DocCategoryManager value={categorieId} onChange={setCategorieId} />
					</div>
					<div>
						<Label htmlFor="cabinet-doc-desc">Description</Label>
						<Textarea
							id="cabinet-doc-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Description courte (optionnel)"
							rows={2}
						/>
					</div>
					{uploading && uploadProgress > 0 && (
						<div className="h-2 bg-muted rounded-full overflow-hidden">
							<div
								className="h-full bg-emerald-600 rounded-full transition-all"
								style={{ width: `${uploadProgress}%` }}
							/>
						</div>
					)}
					<Button
						type="submit"
						className="w-full"
						disabled={uploading || selectedFiles.length === 0}
					>
						{uploading
							? "Upload en cours..."
							: selectedFiles.length > 1
								? `Uploader ${selectedFiles.length} fichiers`
								: "Uploader le document"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	)
}
