"use client"

import { useMutation } from "convex/react"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { CategoryManager } from "@/components/sops/category-manager"
import { type Attachment, PdfAttachments } from "@/components/sops/pdf-attachments"
import { SopEditor } from "@/components/sops/sop-editor"
import { VideoEmbed } from "@/components/sops/video-embed"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { parseVideoUrl } from "@/lib/video-utils"

export default function NewSopPage() {
	const router = useRouter()
	const create = useMutation(api.sops.create)

	const [nom, setNom] = useState("")
	const [description, setDescription] = useState("")
	const [contenu, setContenu] = useState("")
	const [categorieId, setCategorieId] = useState<Id<"sopCategories"> | undefined>()
	const [videoUrl, setVideoUrl] = useState("")
	const [attachments, setAttachments] = useState<Attachment[]>([])
	const [saving, setSaving] = useState(false)

	const videoPreview = videoUrl ? parseVideoUrl(videoUrl) : null

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!nom.trim() || !contenu.trim()) return
		setSaving(true)
		try {
			const id = await create({
				nom: nom.trim(),
				description: description.trim() || undefined,
				contenu: contenu.trim(),
				categorieId,
				videoUrl: videoUrl.trim() || undefined,
				attachments: attachments.length > 0 ? attachments : undefined,
			})
			toast.success("SOP créée")
			router.push(`/sops/${id}`)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div>
			<PageHeader
				title="Nouvelle SOP"
				description="Créer une procédure opérationnelle standard"
				actions={
					<Button variant="ghost" size="sm" onClick={() => router.back()}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Retour
					</Button>
				}
			/>

			<div className="p-6 max-w-3xl">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<Label htmlFor="nom">Nom *</Label>
						<Input
							id="nom"
							value={nom}
							onChange={(e) => setNom(e.target.value)}
							placeholder="Ex : Clôture IS — Checklist"
							required
						/>
					</div>

					<div>
						<Label>Catégorie</Label>
						<CategoryManager value={categorieId} onChange={setCategorieId} />
					</div>

					<div>
						<Label htmlFor="description">Description courte</Label>
						<Input
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Résumé en une phrase"
						/>
					</div>

					<div>
						<Label htmlFor="videoUrl">URL Vidéo</Label>
						<Input
							id="videoUrl"
							value={videoUrl}
							onChange={(e) => setVideoUrl(e.target.value)}
							placeholder="YouTube, Vimeo ou Loom"
						/>
						{videoPreview && (
							<div className="mt-3">
								<VideoEmbed url={videoUrl} />
							</div>
						)}
					</div>

					<div>
						<Label>Contenu *</Label>
						<SopEditor initialContent="" onChange={setContenu} />
					</div>

					<div>
						<Label>Pièces jointes (PDF)</Label>
						<PdfAttachments attachments={attachments} onChange={setAttachments} />
					</div>

					<Button
						type="submit"
						disabled={saving || !nom.trim() || !contenu.trim()}
						className="w-full"
					>
						{saving ? "Création…" : "Créer la SOP"}
					</Button>
				</form>
			</div>
		</div>
	)
}
