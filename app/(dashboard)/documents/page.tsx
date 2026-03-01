"use client"

import { useMutation, useQuery } from "convex/react"
import {
	ChevronDown,
	ChevronRight,
	Download,
	FileText,
	Paperclip,
	Plus,
	Trash2,
	Upload,
} from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { UploadCabinetDialog } from "@/components/documents/upload-cabinet-dialog"
import { PageHeader } from "@/components/shared/page-header"
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
import { Skeleton } from "@/components/ui/skeleton"
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
import { useCurrentUserContext } from "@/lib/contexts/current-user"
import { isManagerOrAbove } from "@/lib/permissions"

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

function formatFileSize(bytes?: number): string {
	if (!bytes) return "—"
	if (bytes < 1024) return `${bytes} o`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function DownloadButton({ storageId }: { storageId: string }) {
	const url = useQuery(api.documents.getDownloadUrl, { storageId })
	if (!url) return null

	return (
		<Button variant="ghost" size="icon" asChild className="h-7 w-7">
			<a href={url} target="_blank" rel="noopener noreferrer">
				<Download className="h-3.5 w-3.5" />
			</a>
		</Button>
	)
}

function FileRow({
	file,
	docId,
	canManage,
}: {
	file: { storageId: string; nom: string; mimeType?: string; fileSize?: number; uploadedAt: number }
	docId: Id<"documents">
	canManage: boolean
}) {
	const removeFileMutation = useMutation(api.documents.removeFile)

	async function handleRemoveFile() {
		try {
			await removeFileMutation({ id: docId, storageId: file.storageId })
			toast.success("Fichier supprimé")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div className="flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/50 text-sm">
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
				<span className="truncate">{file.nom}</span>
				<span className="text-xs text-muted-foreground shrink-0">
					{formatFileSize(file.fileSize)}
				</span>
			</div>
			<div className="flex items-center gap-1 shrink-0">
				<DownloadButton storageId={file.storageId} />
				{canManage && (
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
								<Trash2 className="h-3 w-3" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Supprimer &quot;{file.nom}&quot; ?</AlertDialogTitle>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Annuler</AlertDialogCancel>
								<AlertDialogAction onClick={handleRemoveFile}>Supprimer</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}
			</div>
		</div>
	)
}

function AddFilesButton({ docId }: { docId: Id<"documents"> }) {
	const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
	const addFilesMutation = useMutation(api.documents.addFiles)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [uploading, setUploading] = useState(false)

	async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
		const fileList = e.target.files
		if (!fileList || fileList.length === 0) return
		setUploading(true)

		try {
			const files: {
				storageId: string
				nom: string
				mimeType?: string
				fileSize?: number
				uploadedAt: number
			}[] = []

			for (const file of Array.from(fileList)) {
				const url = await generateUploadUrl()
				const res = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file,
				})
				if (!res.ok) throw new Error(`Échec upload ${file.name}`)
				const { storageId } = await res.json()
				files.push({
					storageId,
					nom: file.name,
					mimeType: file.type || undefined,
					fileSize: file.size,
					uploadedAt: Date.now(),
				})
			}

			await addFilesMutation({ id: docId, files })
			toast.success(files.length === 1 ? "Fichier ajouté" : `${files.length} fichiers ajoutés`)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setUploading(false)
			e.target.value = ""
		}
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="h-7 text-xs"
				disabled={uploading}
				onClick={() => fileInputRef.current?.click()}
			>
				<Upload className="mr-1.5 h-3 w-3" />
				{uploading ? "Upload..." : "Ajouter"}
			</Button>
			<input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} />
		</>
	)
}

export default function DocumentsPage() {
	const [uploadOpen, setUploadOpen] = useState(false)
	const [expandedId, setExpandedId] = useState<Id<"documents"> | null>(null)
	const documents = useQuery(api.documents.list, { filter: "cabinet" })
	const removeDocument = useMutation(api.documents.remove)
	const { role } = useCurrentUserContext()
	const canManage = isManagerOrAbove(role)

	async function handleDelete(docId: Id<"documents">) {
		try {
			await removeDocument({ id: docId })
			toast.success("Document supprimé")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	function toggleExpand(docId: Id<"documents">) {
		setExpandedId((prev) => (prev === docId ? null : docId))
	}

	return (
		<div>
			<PageHeader
				title="Documents"
				description="Documents internes du cabinet"
				actions={
					canManage ? (
						<Button onClick={() => setUploadOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Ajouter un document
						</Button>
					) : undefined
				}
			/>

			<div className="px-6 py-4">
				{documents === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : documents.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">Aucun document</p>
						<p className="text-sm text-muted-foreground mt-1">
							{canManage
								? "Cliquez sur « Ajouter un document » pour commencer."
								: "Aucun document cabinet pour le moment."}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-8" />
									<TableHead>Nom</TableHead>
									<TableHead className="hidden md:table-cell">Catégorie</TableHead>
									<TableHead className="hidden md:table-cell">Description</TableHead>
									<TableHead className="hidden md:table-cell">Fichiers</TableHead>
									<TableHead className="hidden md:table-cell">Date</TableHead>
									<TableHead className="w-20 text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{documents.map((doc) => {
									const hasFiles = doc.files && doc.files.length > 0
									const fileCount = hasFiles ? doc.files!.length : 1
									const isExpanded = expandedId === doc._id

									return (
										<>
											<TableRow
												key={doc._id}
												className={hasFiles ? "cursor-pointer" : ""}
												onClick={hasFiles ? () => toggleExpand(doc._id) : undefined}
											>
												<TableCell className="w-8 px-2">
													{hasFiles ? (
														isExpanded ? (
															<ChevronDown className="h-4 w-4 text-muted-foreground" />
														) : (
															<ChevronRight className="h-4 w-4 text-muted-foreground" />
														)
													) : null}
												</TableCell>
												<TableCell className="font-medium">{doc.nom}</TableCell>
												<TableCell className="hidden md:table-cell">
													{doc.categorieName ? (
														<Badge variant="secondary">{doc.categorieName}</Badge>
													) : (
														<span className="text-muted-foreground">—</span>
													)}
												</TableCell>
												<TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-48 truncate">
													{doc.description ?? "—"}
												</TableCell>
												<TableCell className="hidden md:table-cell">
													<Badge variant="outline" className="font-mono">
														{fileCount} fichier{fileCount > 1 ? "s" : ""}
													</Badge>
												</TableCell>
												<TableCell className="hidden md:table-cell text-muted-foreground">
													{formatDate(doc.createdAt)}
												</TableCell>
												<TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
													<div className="flex items-center justify-end gap-1">
														{!hasFiles && <DownloadButton storageId={doc.storageId} />}
														{canManage && (
															<AlertDialog>
																<AlertDialogTrigger asChild>
																	<Button
																		size="icon"
																		variant="ghost"
																		className="h-8 w-8 text-destructive"
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Supprimer &quot;{doc.nom}&quot; ?
																		</AlertDialogTitle>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>Annuler</AlertDialogCancel>
																		<AlertDialogAction onClick={() => handleDelete(doc._id)}>
																			Supprimer
																		</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														)}
													</div>
												</TableCell>
											</TableRow>
											{hasFiles && isExpanded && (
												<TableRow key={`${doc._id}-files`}>
													<TableCell />
													<TableCell colSpan={6}>
														<div className="space-y-1 py-1">
															{doc.files!.map((file) => (
																<FileRow
																	key={file.storageId}
																	file={file}
																	docId={doc._id}
																	canManage={canManage}
																/>
															))}
															{canManage && (
																<div className="pt-1">
																	<AddFilesButton docId={doc._id} />
																</div>
															)}
														</div>
													</TableCell>
												</TableRow>
											)}
										</>
									)
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			<UploadCabinetDialog open={uploadOpen} onOpenChange={setUploadOpen} />
		</div>
	)
}
