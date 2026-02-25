"use client"

import { useMutation, useQuery } from "convex/react"
import { FileText, Trash2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

function formatFileSize(bytes: number | undefined): string {
	if (!bytes) return "—"
	if (bytes < 1024) return `${bytes} o`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

export function DocumentsTab({ runId, clientId }: { runId: Id<"runs">; clientId: Id<"clients"> }) {
	const documents = useQuery(api.documents.listByRun, { runId })
	const categories = useQuery(api.documents.listCategories)
	const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
	const createDocument = useMutation(api.documents.create)
	const removeDocument = useMutation(api.documents.remove)

	const [dialogOpen, setDialogOpen] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [nom, setNom] = useState("")
	const [categorieId, setCategorieId] = useState("")
	const fileInputRef = useRef<HTMLInputElement>(null)

	function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		setSelectedFile(file)
		setNom(file.name.replace(/\.[^.]+$/, ""))
	}

	async function handleUpload(e: React.FormEvent) {
		e.preventDefault()
		if (!selectedFile) return
		setUploading(true)
		setUploadProgress(10)

		try {
			const uploadUrl = await generateUploadUrl()
			setUploadProgress(30)

			const uploadRes = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": selectedFile.type },
				body: selectedFile,
			})
			setUploadProgress(70)

			if (!uploadRes.ok) throw new Error("Échec de l'upload")

			const { storageId } = await uploadRes.json()
			setUploadProgress(85)

			await createDocument({
				clientId,
				runId,
				nom: nom || selectedFile.name,
				storageId,
				mimeType: selectedFile.type || undefined,
				fileSize: selectedFile.size,
				categorieId: categorieId ? (categorieId as Id<"documentCategories">) : undefined,
			})
			setUploadProgress(100)
			toast.success("Document uploadé")
			setDialogOpen(false)
			setSelectedFile(null)
			setNom("")
			setCategorieId("")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de l'upload")
		} finally {
			setUploading(false)
			setUploadProgress(0)
		}
	}

	async function handleDelete(docId: Id<"documents">) {
		try {
			await removeDocument({ id: docId })
			toast.success("Document supprimé")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => setDialogOpen(true)}>
					<Upload className="mr-2 h-4 w-4" />
					Ajouter un document
				</Button>
			</div>

			{documents === undefined ? (
				<div className="text-center py-8 text-muted-foreground">Chargement...</div>
			) : documents.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
					<p className="text-muted-foreground">Aucun document pour ce run.</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nom</TableHead>
								<TableHead className="hidden md:table-cell">Catégorie</TableHead>
								<TableHead className="hidden md:table-cell">Taille</TableHead>
								<TableHead className="hidden lg:table-cell">Ajouté le</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{documents.map((doc) => (
								<TableRow key={doc._id}>
									<TableCell>
										<div className="font-medium">{doc.nom}</div>
										{doc.mimeType && (
											<div className="text-xs text-muted-foreground">{doc.mimeType}</div>
										)}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										{doc.categorieName ? (
											<Badge variant="secondary">{doc.categorieName}</Badge>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell className="hidden md:table-cell text-muted-foreground text-sm">
										{formatFileSize(doc.fileSize)}
									</TableCell>
									<TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
										{formatDate(doc.createdAt)}
									</TableCell>
									<TableCell className="text-right">
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button size="sm" variant="ghost" className="h-7 text-destructive">
													<Trash2 className="h-3 w-3" />
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Supprimer "{doc.nom}" ?</AlertDialogTitle>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Annuler</AlertDialogCancel>
													<AlertDialogAction onClick={() => handleDelete(doc._id)}>
														Supprimer
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Dialog Upload */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ajouter un document</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleUpload} className="space-y-4">
						<div>
							<Label>Fichier *</Label>
							<button
								type="button"
								className="mt-1 w-full border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
								onClick={() => fileInputRef.current?.click()}
							>
								{selectedFile ? (
									<div>
										<p className="font-medium">{selectedFile.name}</p>
										<p className="text-sm text-muted-foreground mt-1">
											{formatFileSize(selectedFile.size)}
										</p>
									</div>
								) : (
									<div>
										<Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
										<p className="text-sm text-muted-foreground">
											Cliquez pour sélectionner un fichier
										</p>
									</div>
								)}
							</button>
							<input
								ref={fileInputRef}
								type="file"
								className="hidden"
								onChange={handleFileSelect}
							/>
						</div>
						<div>
							<Label htmlFor="doc-nom">Nom du document</Label>
							<Input
								id="doc-nom"
								value={nom}
								onChange={(e) => setNom(e.target.value)}
								placeholder="Nom affiché dans l'interface"
							/>
						</div>
						<div>
							<Label>Catégorie</Label>
							<Select value={categorieId} onValueChange={setCategorieId}>
								<SelectTrigger>
									<SelectValue placeholder="Sans catégorie" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Sans catégorie</SelectItem>
									{categories?.map((cat) => (
										<SelectItem key={cat._id} value={cat._id}>
											{cat.nom}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{uploading && uploadProgress > 0 && (
							<div className="h-2 bg-muted rounded-full overflow-hidden">
								<div
									className="h-full bg-emerald-600 rounded-full transition-all"
									style={{ width: `${uploadProgress}%` }}
								/>
							</div>
						)}
						<Button type="submit" className="w-full" disabled={uploading || !selectedFile}>
							{uploading ? "Upload en cours..." : "Uploader le document"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
