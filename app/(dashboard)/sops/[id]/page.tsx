"use client"

import { useMutation, useQuery } from "convex/react"
import { ArrowLeft, Pencil, Save, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { CategoryManager } from "@/components/sops/category-manager"
import { type Attachment, PdfAttachments } from "@/components/sops/pdf-attachments"
import { SopContentViewer } from "@/components/sops/sop-content-viewer"
import { SopEditor } from "@/components/sops/sop-editor"
import { VideoEmbed } from "@/components/sops/video-embed"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export default function SopDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { role: userRole } = useCurrentUser()
	const sop = useQuery(api.sops.getById, { id: id as Id<"sops"> })
	const update = useMutation(api.sops.update)
	const remove = useMutation(api.sops.remove)

	const [editing, setEditing] = useState(false)
	const [nom, setNom] = useState("")
	const [description, setDescription] = useState("")
	const [contenu, setContenu] = useState("")
	const [categorieId, setCategorieId] = useState<Id<"sopCategories"> | undefined>()
	const [videoUrl, setVideoUrl] = useState("")
	const [attachments, setAttachments] = useState<Attachment[]>([])
	const [saving, setSaving] = useState(false)

	const canManage = userRole === "admin" || userRole === "manager"

	useEffect(() => {
		if (!sop) return
		setNom(sop.nom)
		setDescription(sop.description ?? "")
		setContenu(sop.contenu)
		setCategorieId(sop.categorieId ?? undefined)
		setVideoUrl(sop.videoUrl ?? "")
		setAttachments(sop.attachments ?? [])
	}, [sop])

	async function handleSave() {
		if (!nom.trim() || !contenu.trim()) return
		setSaving(true)
		try {
			await update({
				id: id as Id<"sops">,
				nom: nom.trim(),
				description: description.trim() || undefined,
				contenu: contenu.trim(),
				categorieId,
				videoUrl: videoUrl.trim() || undefined,
				attachments: attachments.length > 0 ? attachments : undefined,
			})
			toast.success("SOP mise à jour")
			setEditing(false)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setSaving(false)
		}
	}

	async function handleToggleActive() {
		if (!sop) return
		try {
			await update({ id: id as Id<"sops">, isActive: !sop.isActive })
			toast.success(sop.isActive ? "SOP désactivée" : "SOP activée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	async function handleRemove() {
		try {
			await remove({ id: id as Id<"sops"> })
			toast.success("SOP supprimée")
			router.push("/sops")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	if (sop === undefined) {
		return (
			<div className="p-6 space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		)
	}

	if (sop === null) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<p className="text-lg">SOP introuvable</p>
				<Button variant="outline" className="mt-4" onClick={() => router.push("/sops")}>
					Retour aux SOPs
				</Button>
			</div>
		)
	}

	return (
		<div>
			<PageHeader
				title={editing ? "Modifier la SOP" : sop.nom}
				description={sop.categoryNom ?? "Procédure opérationnelle"}
				actions={
					<div className="flex gap-2 items-center">
						<Button variant="ghost" size="sm" onClick={() => router.push("/sops")}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Retour
						</Button>
						{canManage && !editing && (
							<>
								<Button variant="outline" size="sm" onClick={handleToggleActive}>
									{sop.isActive ? "Désactiver" : "Activer"}
								</Button>
								<Button size="sm" onClick={() => setEditing(true)}>
									<Pencil className="mr-2 h-4 w-4" />
									Modifier
								</Button>
								{userRole === "admin" && (
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button size="sm" variant="ghost" className="text-destructive">
												<Trash2 className="h-4 w-4" />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Supprimer "{sop.nom}" ?</AlertDialogTitle>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Annuler</AlertDialogCancel>
												<AlertDialogAction onClick={handleRemove}>Supprimer</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								)}
							</>
						)}
						{editing && (
							<>
								<Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
									<X className="mr-2 h-4 w-4" />
									Annuler
								</Button>
								<Button size="sm" onClick={handleSave} disabled={saving}>
									<Save className="mr-2 h-4 w-4" />
									{saving ? "Enregistrement…" : "Enregistrer"}
								</Button>
							</>
						)}
					</div>
				}
			/>

			<div className="p-6 max-w-4xl space-y-6">
				{editing ? (
					<>
						<div>
							<Label>Nom</Label>
							<Input value={nom} onChange={(e) => setNom(e.target.value)} />
						</div>
						<div>
							<Label>Catégorie</Label>
							<CategoryManager value={categorieId} onChange={setCategorieId} />
						</div>
						<div>
							<Label>Description</Label>
							<Input value={description} onChange={(e) => setDescription(e.target.value)} />
						</div>
						<div>
							<Label>URL Vidéo</Label>
							<Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
						</div>
						<div>
							<Label>Contenu</Label>
							<SopEditor key={`edit-${sop._id}`} initialContent={contenu} onChange={setContenu} />
						</div>
						<div>
							<Label>Pièces jointes (PDF)</Label>
							<PdfAttachments attachments={attachments} onChange={setAttachments} />
						</div>
					</>
				) : (
					<>
						{/* Header badges */}
						<div className="flex items-center gap-3">
							<Badge variant={sop.isActive ? "default" : "secondary"}>
								{sop.isActive ? "Active" : "Inactive"}
							</Badge>
							{sop.categoryNom && (
								<Badge
									variant="outline"
									style={
										sop.categoryColor
											? { borderColor: sop.categoryColor, color: sop.categoryColor }
											: undefined
									}
								>
									{sop.categoryNom}
								</Badge>
							)}
						</div>

						{sop.description && <p className="text-muted-foreground">{sop.description}</p>}

						{/* Video */}
						{sop.videoUrl && (
							<section>
								<h2 className="text-sm font-heading uppercase mb-3">Vidéo</h2>
								<VideoEmbed url={sop.videoUrl} />
							</section>
						)}

						{/* Rich content */}
						<section>
							<h2 className="text-sm font-heading uppercase mb-3">Contenu</h2>
							<div className="rounded-md border p-6 bg-card">
								<SopContentViewer html={sop.contenu} />
							</div>
						</section>

						{/* PDF Attachments */}
						{sop.attachments && sop.attachments.length > 0 && (
							<section>
								<h2 className="text-sm font-heading uppercase mb-3">Pièces jointes</h2>
								<PdfAttachments
									attachments={sop.attachments}
									onChange={() => {}}
									editable={false}
								/>
							</section>
						)}
					</>
				)}
			</div>
		</div>
	)
}
