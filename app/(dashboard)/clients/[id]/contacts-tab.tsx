"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Mail, Phone, Trash2, User } from "lucide-react"

export function ContactsTab({ clientId }: { clientId: Id<"clients"> }) {
	const contacts = useQuery(api.contacts.listByClient, { clientId })
	const createContact = useMutation(api.contacts.create)
	const removeContact = useMutation(api.contacts.remove)
	const [open, setOpen] = useState(false)

	async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const form = new FormData(e.currentTarget)
		try {
			await createContact({
				clientId,
				nom: form.get("nom") as string,
				prenom: (form.get("prenom") as string) || undefined,
				email: (form.get("email") as string) || undefined,
				telephone: (form.get("telephone") as string) || undefined,
				fonction: (form.get("fonction") as string) || undefined,
				isPrincipal: form.get("isPrincipal") === "on",
			})
			toast.success("Contact ajouté")
			setOpen(false)
		} catch {
			toast.error("Erreur lors de l'ajout")
		}
	}

	async function handleDelete(contactId: Id<"contacts">) {
		try {
			await removeContact({ id: contactId })
			toast.success("Contact supprimé")
		} catch {
			toast.error("Erreur")
		}
	}

	if (contacts === undefined) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-24 w-full" />
				))}
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Contacts ({contacts.length})</h3>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button size="sm">
							<Plus className="mr-2 h-4 w-4" />
							Ajouter un contact
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Nouveau contact</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreate} className="space-y-4">
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<Label htmlFor="nom">Nom *</Label>
									<Input id="nom" name="nom" required />
								</div>
								<div>
									<Label htmlFor="prenom">Prénom</Label>
									<Input id="prenom" name="prenom" />
								</div>
								<div>
									<Label htmlFor="email">Email</Label>
									<Input id="email" name="email" type="email" />
								</div>
								<div>
									<Label htmlFor="telephone">Téléphone</Label>
									<Input id="telephone" name="telephone" type="tel" />
								</div>
								<div>
									<Label htmlFor="fonction">Fonction</Label>
									<Input id="fonction" name="fonction" placeholder="Gérant, DAF..." />
								</div>
								<div className="flex items-center gap-2 pt-6">
									<input id="isPrincipal" name="isPrincipal" type="checkbox" className="h-4 w-4" />
									<Label htmlFor="isPrincipal" className="text-sm">Contact principal</Label>
								</div>
							</div>
							<Button type="submit" className="w-full">Ajouter</Button>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{contacts.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					<User className="h-10 w-10 mx-auto mb-2 opacity-50" />
					<p>Aucun contact pour ce client.</p>
				</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{contacts.map((contact) => (
						<Card key={contact._id}>
							<CardContent className="pt-4">
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{contact.prenom ? `${contact.prenom} ` : ""}{contact.nom}
											</span>
											{contact.isPrincipal && (
												<Badge variant="default" className="text-xs">Principal</Badge>
											)}
										</div>
										{contact.fonction && (
											<p className="text-sm text-muted-foreground mt-0.5">{contact.fonction}</p>
										)}
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground hover:text-destructive"
										onClick={() => handleDelete(contact._id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
								<div className="mt-2 space-y-1">
									{contact.email && (
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<Mail className="h-3.5 w-3.5" />
											{contact.email}
										</div>
									)}
									{contact.telephone && (
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<Phone className="h-3.5 w-3.5" />
											{contact.telephone}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
