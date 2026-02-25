"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useCurrentUser } from "@/lib/hooks/use-current-user"

const ROLE_LABELS: Record<string, string> = {
	associe: "Associé",
	manager: "Manager",
	collaborateur: "Collaborateur",
	assistante: "Assistante",
}

const ROLES = [
	{ value: "associe", label: "Associé" },
	{ value: "manager", label: "Manager" },
	{ value: "collaborateur", label: "Collaborateur" },
	{ value: "assistante", label: "Assistante" },
]

const ROLE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
	associe: "default",
	manager: "secondary",
	collaborateur: "outline",
	assistante: "outline",
}

export default function EquipePage() {
	const { user, isAssociate, isLoading } = useCurrentUser()
	const members = useQuery(api.equipe.listMembers)
	const createByAdmin = useAction(api.users.createByAdmin)
	const updateRole = useMutation(api.users.updateRole)

	const [dialogOpen, setDialogOpen] = useState(false)
	const [creating, setCreating] = useState(false)
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		nom: "",
		role: "collaborateur",
	})

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		try {
			await createByAdmin({
				email: formData.email,
				password: formData.password,
				name: formData.nom,
				role: formData.role as "associe" | "manager" | "collaborateur" | "assistante",
			})
			toast.success("Membre créé avec succès")
			setDialogOpen(false)
			setFormData({ email: "", password: "", nom: "", role: "collaborateur" })
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de la création")
		} finally {
			setCreating(false)
		}
	}

	async function handleRoleChange(userId: string, newRole: string) {
		try {
			await updateRole({
				userId,
				newRole: newRole as "associe" | "manager" | "collaborateur" | "assistante",
			})
			toast.success("Rôle mis à jour")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors du changement de rôle")
		}
	}

	if (isLoading) {
		return (
			<div>
				<PageHeader title="Équipe" description="Gestion des membres du cabinet" />
				<div className="p-6 space-y-4">
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div>
			<PageHeader
				title="Équipe"
				description="Gestion des membres du cabinet"
				actions={
					isAssociate ? (
						<Button onClick={() => setDialogOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Nouveau membre
						</Button>
					) : undefined
				}
			/>

			<div className="p-6 space-y-6">
				{/* Mon profil */}
				{user && (
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Mon profil</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Nom</span>
								<span className="font-medium">{user.name}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Email</span>
								<span className="font-medium">{user.email}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Rôle</span>
								<Badge variant={ROLE_BADGE_VARIANTS[user.role as string] ?? "outline"}>
									{ROLE_LABELS[user.role as string] ?? user.role}
								</Badge>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Liste des membres */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Membres de l'équipe</CardTitle>
					</CardHeader>
					<CardContent>
						{members === undefined ? (
							<div className="space-y-2">
								{[...Array(4)].map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						) : members.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">Aucun membre dans l'équipe</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Nom</TableHead>
										<TableHead className="hidden md:table-cell">Email</TableHead>
										<TableHead>Rôle</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{members.map((member) => (
										<TableRow key={member._id}>
											<TableCell className="font-medium">{member.nom ?? "—"}</TableCell>
											<TableCell className="hidden md:table-cell text-muted-foreground">
												{member.email ?? "—"}
											</TableCell>
											<TableCell>
												{isAssociate ? (
													<Select
														value={member.role}
														onValueChange={(val) => handleRoleChange(member.userId, val)}
													>
														<SelectTrigger className="w-40">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{ROLES.map((r) => (
																<SelectItem key={r.value} value={r.value}>
																	{r.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													<Badge variant={ROLE_BADGE_VARIANTS[member.role] ?? "outline"}>
														{ROLE_LABELS[member.role] ?? member.role}
													</Badge>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Dialog Créer un membre */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Créer un membre</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreate} className="space-y-4">
						<div>
							<Label htmlFor="create-nom">Nom complet</Label>
							<Input
								id="create-nom"
								value={formData.nom}
								onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
								required
							/>
						</div>
						<div>
							<Label htmlFor="create-email">Email</Label>
							<Input
								id="create-email"
								type="email"
								value={formData.email}
								onChange={(e) => setFormData({ ...formData, email: e.target.value })}
								required
							/>
						</div>
						<div>
							<Label htmlFor="create-password">Mot de passe</Label>
							<Input
								id="create-password"
								type="password"
								value={formData.password}
								onChange={(e) => setFormData({ ...formData, password: e.target.value })}
								required
								minLength={8}
							/>
						</div>
						<div>
							<Label>Rôle</Label>
							<Select
								value={formData.role}
								onValueChange={(val) => setFormData({ ...formData, role: val })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ROLES.map((r) => (
										<SelectItem key={r.value} value={r.value}>
											{r.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button type="submit" className="w-full" disabled={creating}>
							{creating ? "Création..." : "Créer le membre"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
