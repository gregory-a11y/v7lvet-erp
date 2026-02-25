"use client"

import { useMutation } from "convex/react"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"

export default function NewSopPage() {
	const router = useRouter()
	const create = useMutation(api.sops.create)

	const [nom, setNom] = useState("")
	const [description, setDescription] = useState("")
	const [contenu, setContenu] = useState("")
	const [categorie, setCategorie] = useState("")
	const [saving, setSaving] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!nom.trim() || !contenu.trim()) return
		setSaving(true)
		try {
			const id = await create({
				nom: nom.trim(),
				description: description.trim() || undefined,
				contenu: contenu.trim(),
				categorie: categorie.trim() || undefined,
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

			<div className="p-6 max-w-2xl">
				<form onSubmit={handleSubmit} className="space-y-5">
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
						<Label htmlFor="categorie">Catégorie</Label>
						<Input
							id="categorie"
							value={categorie}
							onChange={(e) => setCategorie(e.target.value)}
							placeholder="Ex : fiscal, compta, paie…"
						/>
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
						<Label htmlFor="contenu">Contenu *</Label>
						<Textarea
							id="contenu"
							value={contenu}
							onChange={(e) => setContenu(e.target.value)}
							placeholder="Décrivez les étapes de la procédure (Markdown supporté)"
							rows={16}
							className="font-mono text-sm"
							required
						/>
					</div>
					<Button type="submit" disabled={saving} className="w-full">
						{saving ? "Création…" : "Créer la SOP"}
					</Button>
				</form>
			</div>
		</div>
	)
}
