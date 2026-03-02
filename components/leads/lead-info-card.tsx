"use client"

import { Building2, Mail, Pencil, Phone, User } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Doc } from "@/convex/_generated/dataModel"
import { useUpdateLead } from "@/lib/hooks/use-leads"

interface LeadInfoCardProps {
	lead: Doc<"leads">
}

export function LeadInfoCard({ lead }: LeadInfoCardProps) {
	const updateLead = useUpdateLead()
	const [editing, setEditing] = useState(false)
	const [form, setForm] = useState({
		contactNom: lead.contactNom,
		contactPrenom: lead.contactPrenom ?? "",
		contactEmail: lead.contactEmail ?? "",
		contactTelephone: lead.contactTelephone ?? "",
		entrepriseRaisonSociale: lead.entrepriseRaisonSociale ?? "",
		entrepriseSiren: lead.entrepriseSiren ?? "",
		entrepriseFormeJuridique: lead.entrepriseFormeJuridique ?? "",
		notes: lead.notes ?? "",
	})

	const handleSave = async () => {
		try {
			await updateLead({
				id: lead._id,
				contactNom: form.contactNom,
				contactPrenom: form.contactPrenom || undefined,
				contactEmail: form.contactEmail || undefined,
				contactTelephone: form.contactTelephone || undefined,
				entrepriseRaisonSociale: form.entrepriseRaisonSociale || undefined,
				entrepriseSiren: form.entrepriseSiren || undefined,
				entrepriseFormeJuridique: form.entrepriseFormeJuridique || undefined,
				notes: form.notes || undefined,
			})
			toast.success("Lead mis à jour")
			setEditing(false)
		} catch (err: any) {
			toast.error(err.message ?? "Erreur")
		}
	}

	if (!editing) {
		return (
			<div className="space-y-4">
				{/* Contact */}
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm flex items-center gap-2">
								<User className="h-4 w-4" />
								Contact
							</CardTitle>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={() => setEditing(true)}
							>
								<Pencil className="h-3.5 w-3.5" />
							</Button>
						</div>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<p className="font-medium">
							{lead.contactNom}
							{lead.contactPrenom && ` ${lead.contactPrenom}`}
						</p>
						{lead.contactEmail && (
							<p className="flex items-center gap-2 text-muted-foreground">
								<Mail className="h-3.5 w-3.5" />
								<a href={`mailto:${lead.contactEmail}`} className="hover:underline">
									{lead.contactEmail}
								</a>
							</p>
						)}
						{lead.contactTelephone && (
							<p className="flex items-center gap-2 text-muted-foreground">
								<Phone className="h-3.5 w-3.5" />
								<a href={`tel:${lead.contactTelephone}`} className="hover:underline">
									{lead.contactTelephone}
								</a>
							</p>
						)}
					</CardContent>
				</Card>

				{/* Entreprise */}
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm flex items-center gap-2">
							<Building2 className="h-4 w-4" />
							Entreprise
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						{lead.entrepriseRaisonSociale ? (
							<>
								<p className="font-medium">{lead.entrepriseRaisonSociale}</p>
								{lead.entrepriseSiren && (
									<p className="text-muted-foreground">SIREN : {lead.entrepriseSiren}</p>
								)}
								{lead.entrepriseFormeJuridique && (
									<p className="text-muted-foreground">{lead.entrepriseFormeJuridique}</p>
								)}
								{lead.entrepriseCA != null && (
									<p className="text-muted-foreground">
										CA : {lead.entrepriseCA.toLocaleString("fr-FR")} €
									</p>
								)}
								{lead.entrepriseNbSalaries != null && (
									<p className="text-muted-foreground">
										{lead.entrepriseNbSalaries} salarié{lead.entrepriseNbSalaries > 1 ? "s" : ""}
									</p>
								)}
							</>
						) : (
							<p className="text-muted-foreground">Aucune entreprise renseignée</p>
						)}
					</CardContent>
				</Card>

				{/* Notes */}
				{lead.notes && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Notes</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
						</CardContent>
					</Card>
				)}
			</div>
		)
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">Modifier le lead</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1">
						<Label className="text-xs">Nom *</Label>
						<Input
							value={form.contactNom}
							onChange={(e) => setForm({ ...form, contactNom: e.target.value })}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Prénom</Label>
						<Input
							value={form.contactPrenom}
							onChange={(e) => setForm({ ...form, contactPrenom: e.target.value })}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Email</Label>
						<Input
							type="email"
							value={form.contactEmail}
							onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Téléphone</Label>
						<Input
							value={form.contactTelephone}
							onChange={(e) => setForm({ ...form, contactTelephone: e.target.value })}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Raison sociale</Label>
						<Input
							value={form.entrepriseRaisonSociale}
							onChange={(e) => setForm({ ...form, entrepriseRaisonSociale: e.target.value })}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">SIREN</Label>
						<Input
							value={form.entrepriseSiren}
							onChange={(e) => setForm({ ...form, entrepriseSiren: e.target.value })}
						/>
					</div>
				</div>
				<div className="space-y-1">
					<Label className="text-xs">Notes</Label>
					<Textarea
						value={form.notes}
						onChange={(e) => setForm({ ...form, notes: e.target.value })}
						rows={3}
					/>
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={() => setEditing(false)}>
						Annuler
					</Button>
					<Button size="sm" onClick={handleSave} disabled={!form.contactNom.trim()}>
						Enregistrer
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
