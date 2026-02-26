"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { Mail, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
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
import { SECTION_LABELS, type SectionKey } from "@/lib/permissions"

const ROLE_LABELS: Record<string, string> = {
	admin: "Admin",
	manager: "Manager",
	collaborateur: "Collaborateur",
}

const ROLES = [
	{ value: "admin", label: "Admin" },
	{ value: "manager", label: "Manager" },
	{ value: "collaborateur", label: "Collaborateur" },
]

const ROLE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
	admin: "default",
	manager: "secondary",
	collaborateur: "outline",
}

const ALL_SECTIONS: SectionKey[] = ["operationnel", "acquisition", "administration"]

function SectionsMultiSelect({
	value,
	onChange,
}: {
	value: string[]
	onChange: (sections: string[]) => void
}) {
	return (
		<div className="space-y-2">
			{ALL_SECTIONS.map((section) => (
				<div key={section} className="flex items-center gap-2">
					<Checkbox
						id={`section-${section}`}
						checked={value.includes(section)}
						onCheckedChange={(checked: boolean | "indeterminate") => {
							if (checked) {
								onChange([...value, section])
							} else {
								onChange(value.filter((s) => s !== section))
							}
						}}
					/>
					<Label htmlFor={`section-${section}`} className="text-sm font-normal cursor-pointer">
						{SECTION_LABELS[section]}
					</Label>
				</div>
			))}
		</div>
	)
}

export default function EquipePage() {
	const { user, isAdmin, isLoading } = useCurrentUser()
	const members = useQuery(api.equipe.listMembers)
	const createByAdmin = useAction(api.users.createByAdmin)
	const updateRole = useMutation(api.users.updateRole)
	const updateUserSections = useMutation(api.users.updateUserSections)
	const resendWelcome = useAction(api.users.resendWelcomeEmail)
	const deleteMember = useMutation(api.users.deleteMember)

	const [dialogOpen, setDialogOpen] = useState(false)
	const [creating, setCreating] = useState(false)
	const [formData, setFormData] = useState({
		email: "",
		nom: "",
		role: "collaborateur",
		sections: ["operationnel"] as string[],
	})

	// Edit sections dialog
	const [editSectionsOpen, setEditSectionsOpen] = useState(false)
	const [editingSections, setEditingSections] = useState<string[]>([])
	const [editingUserId, setEditingUserId] = useState<string | null>(null)
	const [editingUserName, setEditingUserName] = useState("")

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		try {
			const result = await createByAdmin({
				email: formData.email,
				name: formData.nom,
				role: formData.role as "admin" | "manager" | "collaborateur",
				sections: formData.sections,
			})
			if (result.isExistingUser) {
				toast.success(`Membre existant — Nouveaux identifiants envoyés à ${formData.email}`, {
					duration: 8000,
				})
			} else if (result.emailSent) {
				toast.success(`Membre créé — Email envoyé à ${formData.email}`, {
					duration: 8000,
				})
			} else {
				toast.success("Membre créé")
			}
			if (result.generatedPassword) {
				toast.info(`Mot de passe : ${result.generatedPassword}`, {
					duration: 30000,
					description: "Copiez ce mot de passe et transmettez-le au membre.",
				})
			}
			setDialogOpen(false)
			setFormData({ email: "", nom: "", role: "collaborateur", sections: ["operationnel"] })
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
				newRole: newRole as "admin" | "manager" | "collaborateur",
			})
			toast.success("Rôle mis à jour")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors du changement de rôle")
		}
	}

	function openEditSections(userId: string, name: string, currentSections?: string[]) {
		setEditingUserId(userId)
		setEditingUserName(name)
		setEditingSections(currentSections ?? ["operationnel"])
		setEditSectionsOpen(true)
	}

	async function handleSaveSections() {
		if (!editingUserId) return
		try {
			await updateUserSections({
				userId: editingUserId,
				sections: editingSections,
			})
			toast.success("Sections mises à jour")
			setEditSectionsOpen(false)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de la mise à jour")
		}
	}

	async function handleResendEmail(userId: string, email: string, name: string) {
		try {
			const result = await resendWelcome({ userId, email, name })
			if (result.emailSent) {
				toast.success(`Email envoyé à ${email}`)
			}
			if (result.generatedPassword) {
				toast.info(`Nouveau mot de passe : ${result.generatedPassword}`, {
					duration: 30000,
					description: "Copiez ce mot de passe et transmettez-le au membre.",
				})
			}
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de l'envoi")
		}
	}

	async function handleDeleteMember(userId: string, name: string) {
		if (!confirm(`Supprimer le membre "${name}" ? Cette action est irréversible.`)) return
		try {
			await deleteMember({ userId })
			toast.success(`Membre "${name}" supprimé`)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de la suppression")
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
					isAdmin ? (
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
										<TableHead className="hidden lg:table-cell">Sections</TableHead>
										{isAdmin && <TableHead className="w-10" />}
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
												{isAdmin ? (
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
											<TableCell className="hidden lg:table-cell">
												<div className="flex flex-wrap gap-1">
													{(member.sections ?? []).length > 0
														? (member.sections as string[]).map((s) => (
																<Badge key={s} variant="outline" className="text-xs">
																	{SECTION_LABELS[s as SectionKey] ?? s}
																</Badge>
															))
														: ALL_SECTIONS.filter(() => {
																// Show defaults based on role
																return true
															}).map((s) => (
																<Badge key={s} variant="outline" className="text-xs opacity-50">
																	{SECTION_LABELS[s]}
																</Badge>
															))}
												</div>
											</TableCell>
											{isAdmin && (
												<TableCell>
													<div className="flex gap-1">
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															title="Renvoyer les identifiants"
															onClick={() =>
																handleResendEmail(
																	member.userId,
																	member.email ?? "",
																	member.nom ?? "—",
																)
															}
														>
															<Mail className="h-3.5 w-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															title="Modifier les sections"
															onClick={() =>
																openEditSections(
																	member.userId,
																	member.nom ?? "—",
																	member.sections as string[] | undefined,
																)
															}
														>
															<Pencil className="h-3.5 w-3.5" />
														</Button>
														{user && (user.id as string) !== member.userId && (
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-destructive hover:text-destructive"
																title="Supprimer le membre"
																onClick={() => handleDeleteMember(member.userId, member.nom ?? "—")}
															>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														)}
													</div>
												</TableCell>
											)}
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
						<DialogDescription>
							Un mot de passe sera généré automatiquement et envoyé par email.
						</DialogDescription>
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
						<div>
							<Label>Sections accessibles</Label>
							<div className="mt-2">
								<SectionsMultiSelect
									value={formData.sections}
									onChange={(sections) => setFormData({ ...formData, sections })}
								/>
							</div>
						</div>
						<Button type="submit" className="w-full" disabled={creating}>
							{creating ? "Création..." : "Créer le membre"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>

			{/* Dialog Modifier les sections */}
			<Dialog open={editSectionsOpen} onOpenChange={setEditSectionsOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Modifier les sections</DialogTitle>
						<DialogDescription>
							Modifier les sections accessibles pour {editingUserName}
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<SectionsMultiSelect value={editingSections} onChange={setEditingSections} />
					</div>
					<Button onClick={handleSaveSections} className="w-full">
						Enregistrer
					</Button>
				</DialogContent>
			</Dialog>
		</div>
	)
}
