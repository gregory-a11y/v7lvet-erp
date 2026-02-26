"use client"

import { useMutation, useQuery } from "convex/react"
import { ArrowLeft, Pencil, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export default function SopDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { role: userRole } = useCurrentUser()
	const sop = useQuery(api.sops.getById, { id: id as Id<"sops"> })
	const update = useMutation(api.sops.update)

	const [editing, setEditing] = useState(false)
	const [nom, setNom] = useState("")
	const [description, setDescription] = useState("")
	const [contenu, setContenu] = useState("")
	const [categorie, setCategorie] = useState("")
	const [saving, setSaving] = useState(false)

	const canManage = userRole === "admin" || userRole === "manager"

	useEffect(() => {
		if (!sop) return
		setNom(sop.nom)
		setDescription(sop.description ?? "")
		setContenu(sop.contenu)
		setCategorie(sop.categorie ?? "")
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
				categorie: categorie.trim() || undefined,
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
				description={sop.categorie ?? "Procédure opérationnelle"}
				actions={
					<div className="flex gap-2 items-center">
						<Button variant="ghost" size="sm" onClick={() => router.back()}>
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

			<div className="p-6 max-w-3xl space-y-5">
				{editing ? (
					<>
						<div>
							<Label>Nom</Label>
							<Input value={nom} onChange={(e) => setNom(e.target.value)} />
						</div>
						<div>
							<Label>Catégorie</Label>
							<Input value={categorie} onChange={(e) => setCategorie(e.target.value)} />
						</div>
						<div>
							<Label>Description</Label>
							<Input value={description} onChange={(e) => setDescription(e.target.value)} />
						</div>
						<div>
							<Label>Contenu</Label>
							<Textarea
								value={contenu}
								onChange={(e) => setContenu(e.target.value)}
								rows={20}
								className="font-mono text-sm"
							/>
						</div>
					</>
				) : (
					<>
						<div className="flex items-center gap-3">
							<Badge variant={sop.isActive ? "default" : "secondary"}>
								{sop.isActive ? "Active" : "Inactive"}
							</Badge>
							{sop.categorie && <Badge variant="outline">{sop.categorie}</Badge>}
						</div>
						{sop.description && <p className="text-muted-foreground">{sop.description}</p>}
						<div className="rounded-md border p-4 bg-muted/30">
							<pre className="text-sm whitespace-pre-wrap font-sans">{sop.contenu}</pre>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
