"use client"

import { useMutation, useQuery } from "convex/react"
import { motion } from "framer-motion"
import { Camera, Check, Eye, EyeOff, KeyRound, Loader2, Trash2, UserCircle } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { OnlineIndicator } from "@/components/shared/online-indicator"
import { PageHeader } from "@/components/shared/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { api } from "@/convex/_generated/api"
import { fadeInUp, springSmooth, staggerContainer } from "@/lib/animations"
import { changePassword, updateUser, useSession } from "@/lib/auth-client"
import { useIsUserOnline } from "@/lib/hooks/use-presence"

const ROLE_LABELS: Record<string, string> = {
	admin: "Admin",
	manager: "Manager",
	collaborateur: "Collaborateur",
}

export default function ProfilPage() {
	const { data: session } = useSession()
	const myProfile = useQuery(api.users.getMyProfile)
	const updateProfile = useMutation(api.users.updateProfile)
	const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl)
	const updateAvatar = useMutation(api.users.updateAvatar)
	const removeAvatarMutation = useMutation(api.users.removeAvatar)
	const isOnline = useIsUserOnline(myProfile?.id)

	// Form state — prénom / nom séparés
	const [prenom, setPrenom] = useState<string | null>(null)
	const [nom, setNom] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [uploadingAvatar, setUploadingAvatar] = useState(false)

	// Password state
	const [currentPassword, setCurrentPassword] = useState("")
	const [newPassword, setNewPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [showCurrentPassword, setShowCurrentPassword] = useState(false)
	const [showNewPassword, setShowNewPassword] = useState(false)
	const [changingPassword, setChangingPassword] = useState(false)

	const fileInputRef = useRef<HTMLInputElement>(null)

	if (!session?.user || myProfile === undefined) {
		return (
			<div className="flex items-center justify-center h-96">
				<Loader2 className="h-6 w-6 animate-spin text-v7-emeraude" />
			</div>
		)
	}

	if (myProfile === null) {
		return (
			<div className="flex items-center justify-center h-96 text-muted-foreground">
				Profil non trouvé
			</div>
		)
	}

	// Parse existing name into prénom / nom
	const nameParts = (myProfile.name ?? "").split(" ")
	const currentPrenom = nameParts[0] ?? ""
	const currentNom = nameParts.slice(1).join(" ")
	const displayPrenom = prenom ?? currentPrenom
	const displayNom = nom ?? currentNom
	const displayFullName = [displayPrenom, displayNom].filter(Boolean).join(" ")
	const initials = (displayFullName || myProfile.email || "U")
		.split(" ")
		.map((w: string) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)

	async function handleSaveProfile() {
		if (!myProfile) return
		setSaving(true)
		try {
			// Build the full name from prénom + nom
			const newFullName = [displayPrenom, displayNom].filter(Boolean).join(" ")
			const nameChanged = prenom !== null || nom !== null

			// Update Better Auth user (source of truth for name)
			if (nameChanged && newFullName) {
				const result = await updateUser({ name: newFullName })
				if (result.error) {
					toast.error(result.error.message ?? "Erreur lors de la mise à jour")
					setSaving(false)
					return
				}
			}

			// Also sync to Convex userProfiles
			if (nameChanged) {
				await updateProfile({
					userId: myProfile.id,
					nom: newFullName || undefined,
				})
			}

			toast.success("Profil mis à jour")
			setPrenom(null)
			setNom(null)
		} catch {
			toast.error("Erreur lors de la mise à jour")
		} finally {
			setSaving(false)
		}
	}

	async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return

		// Validate file
		if (!file.type.startsWith("image/")) {
			toast.error("Le fichier doit être une image")
			return
		}
		if (file.size > 5 * 1024 * 1024) {
			toast.error("L'image ne doit pas dépasser 5 Mo")
			return
		}

		setUploadingAvatar(true)
		try {
			const uploadUrl = await generateUploadUrl()
			const result = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			})
			const { storageId } = await result.json()
			await updateAvatar({ storageId })
			toast.success("Photo de profil mise à jour")
		} catch {
			toast.error("Erreur lors de l'upload")
		} finally {
			setUploadingAvatar(false)
			// Reset input
			if (fileInputRef.current) fileInputRef.current.value = ""
		}
	}

	async function handleRemoveAvatar() {
		try {
			await removeAvatarMutation()
			toast.success("Photo de profil supprimée")
		} catch {
			toast.error("Erreur lors de la suppression")
		}
	}

	const passwordCriteria = {
		minLength: newPassword.length >= 8,
		hasUppercase: /[A-Z]/.test(newPassword),
		hasLowercase: /[a-z]/.test(newPassword),
		hasNumber: /[0-9]/.test(newPassword),
	}
	const passwordAllValid =
		passwordCriteria.minLength &&
		passwordCriteria.hasUppercase &&
		passwordCriteria.hasLowercase &&
		passwordCriteria.hasNumber

	async function handleChangePassword() {
		if (!passwordAllValid) {
			toast.error("Le mot de passe ne respecte pas tous les critères de sécurité")
			return
		}
		if (newPassword !== confirmPassword) {
			toast.error("Les mots de passe ne correspondent pas")
			return
		}

		setChangingPassword(true)
		try {
			const result = await changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: false,
			})
			if (result.error) {
				toast.error(result.error.message ?? "Mot de passe actuel incorrect")
			} else {
				toast.success("Mot de passe modifié avec succès")
				setCurrentPassword("")
				setNewPassword("")
				setConfirmPassword("")
			}
		} catch (_err) {
			toast.error("Erreur lors du changement de mot de passe")
		} finally {
			setChangingPassword(false)
		}
	}

	const hasProfileChanges = prenom !== null || nom !== null
	const canChangePassword =
		currentPassword &&
		newPassword &&
		confirmPassword &&
		newPassword === confirmPassword &&
		passwordAllValid

	return (
		<div>
			<PageHeader
				title="Mon profil"
				description="Gérer vos informations personnelles et votre sécurité"
			/>

			<motion.div
				variants={staggerContainer}
				initial="hidden"
				animate="show"
				className="p-6 md:p-8 max-w-3xl space-y-6"
			>
				{/* ─── Avatar & Identity Card ─── */}
				<motion.div variants={fadeInUp}>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-6">
								{/* Avatar */}
								<div className="relative group">
									<Avatar className="h-24 w-24 border-2 border-border">
										{myProfile.avatarUrl && (
											<AvatarImage src={myProfile.avatarUrl} alt={displayFullName} />
										)}
										<AvatarFallback className="bg-v7-emeraude text-white text-xl font-medium">
											{initials}
										</AvatarFallback>
									</Avatar>

									{/* Online indicator */}
									<OnlineIndicator
										isOnline={isOnline}
										size="md"
										className="absolute bottom-0 right-0 border-white"
									/>

									{/* Upload overlay */}
									<motion.button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										whileHover={{ opacity: 1 }}
										initial={{ opacity: 0 }}
										className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
									>
										{uploadingAvatar ? (
											<Loader2 className="h-6 w-6 animate-spin text-white" />
										) : (
											<Camera className="h-6 w-6 text-white" />
										)}
									</motion.button>

									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										className="hidden"
										onChange={handleAvatarUpload}
									/>
								</div>

								{/* Identity */}
								<div className="flex-1 min-w-0">
									<h2 className="text-xl font-semibold text-foreground">
										{displayFullName || myProfile.name}
									</h2>
									<p className="text-sm text-muted-foreground mt-0.5">{myProfile.email}</p>
									<div className="flex items-center gap-2 mt-2">
										<span className="inline-flex items-center rounded-md bg-v7-emeraude/10 px-2.5 py-0.5 text-xs font-medium text-v7-emeraude uppercase tracking-wider">
											{ROLE_LABELS[myProfile.role] ?? myProfile.role}
										</span>
										<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<span
												className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-gray-400"}`}
											/>
											{isOnline ? "En ligne" : "Hors ligne"}
										</span>
									</div>
								</div>

								{/* Avatar actions */}
								{myProfile.avatarUrl && (
									<Button
										variant="ghost"
										size="icon"
										className="text-muted-foreground hover:text-destructive"
										onClick={handleRemoveAvatar}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* ─── Personal Info ─── */}
				<motion.div variants={fadeInUp}>
					<Card>
						<CardHeader className="pb-4">
							<CardTitle className="flex items-center gap-2 text-base">
								<UserCircle className="h-5 w-5 text-v7-emeraude" />
								Informations personnelles
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="prenom">Prénom</Label>
									<Input
										id="prenom"
										value={displayPrenom}
										onChange={(e) => setPrenom(e.target.value)}
										placeholder="Votre prénom"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="nom">Nom</Label>
									<Input
										id="nom"
										value={displayNom}
										onChange={(e) => setNom(e.target.value)}
										placeholder="Votre nom"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="email" className="text-muted-foreground">
										Adresse email
									</Label>
									<Input
										id="email"
										type="email"
										value={myProfile.email ?? ""}
										disabled
										className="bg-muted/50"
									/>
									<p className="text-xs text-muted-foreground">
										Contactez un admin pour modifier votre email
									</p>
								</div>
								<div className="space-y-2">
									<Label className="text-muted-foreground">Rôle</Label>
									<div className="text-sm px-3 py-2 bg-muted/50 rounded-md text-foreground h-9 flex items-center">
										{ROLE_LABELS[myProfile.role] ?? myProfile.role}
									</div>
									<p className="text-xs text-muted-foreground">
										Modifiable uniquement par un admin
									</p>
								</div>
							</div>

							{hasProfileChanges && (
								<motion.div
									initial={{ opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									transition={springSmooth}
									className="flex justify-end"
								>
									<Button
										onClick={handleSaveProfile}
										disabled={saving}
										className="bg-v7-emeraude hover:bg-v7-emeraude/90"
									>
										{saving ? (
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
										) : (
											<Check className="h-4 w-4 mr-2" />
										)}
										Enregistrer
									</Button>
								</motion.div>
							)}
						</CardContent>
					</Card>
				</motion.div>

				{/* ─── Security ─── */}
				<motion.div variants={fadeInUp}>
					<Card>
						<CardHeader className="pb-4">
							<CardTitle className="flex items-center gap-2 text-base">
								<KeyRound className="h-5 w-5 text-v7-emeraude" />
								Sécurité
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Modifiez votre mot de passe de manière sécurisée via Better Auth.
							</p>

							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="current-password">Mot de passe actuel</Label>
									<div className="relative">
										<Input
											id="current-password"
											type={showCurrentPassword ? "text" : "password"}
											value={currentPassword}
											onChange={(e) => setCurrentPassword(e.target.value)}
											placeholder="••••••••"
											className="pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowCurrentPassword(!showCurrentPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										>
											{showCurrentPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>

								<Separator />

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="new-password">Nouveau mot de passe</Label>
										<div className="relative">
											<Input
												id="new-password"
												type={showNewPassword ? "text" : "password"}
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												placeholder="••••••••"
												className="pr-10"
											/>
											<button
												type="button"
												onClick={() => setShowNewPassword(!showNewPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											>
												{showNewPassword ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</button>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="confirm-password">Confirmer</Label>
										<Input
											id="confirm-password"
											type="password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											placeholder="••••••••"
										/>
										{confirmPassword && newPassword !== confirmPassword && (
											<p className="text-xs text-destructive">
												Les mots de passe ne correspondent pas
											</p>
										)}
									</div>
								</div>
							</div>

							{newPassword.length > 0 && (
								<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
									<p
										className={
											passwordCriteria.minLength ? "text-emerald-600" : "text-muted-foreground"
										}
									>
										{passwordCriteria.minLength ? "✓" : "○"} 8 caractères minimum
									</p>
									<p
										className={
											passwordCriteria.hasUppercase ? "text-emerald-600" : "text-muted-foreground"
										}
									>
										{passwordCriteria.hasUppercase ? "✓" : "○"} Une majuscule
									</p>
									<p
										className={
											passwordCriteria.hasLowercase ? "text-emerald-600" : "text-muted-foreground"
										}
									>
										{passwordCriteria.hasLowercase ? "✓" : "○"} Une minuscule
									</p>
									<p
										className={
											passwordCriteria.hasNumber ? "text-emerald-600" : "text-muted-foreground"
										}
									>
										{passwordCriteria.hasNumber ? "✓" : "○"} Un chiffre
									</p>
								</div>
							)}

							<div className="flex justify-end">
								<Button
									onClick={handleChangePassword}
									disabled={changingPassword || !canChangePassword}
									variant="outline"
									className="border-v7-emeraude text-v7-emeraude hover:bg-v7-emeraude hover:text-white"
								>
									{changingPassword ? (
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
									) : (
										<KeyRound className="h-4 w-4 mr-2" />
									)}
									Changer le mot de passe
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</motion.div>
		</div>
	)
}
