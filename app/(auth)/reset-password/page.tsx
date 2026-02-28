"use client"

import { useAction } from "convex/react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/convex/_generated/api"
import { resetPassword } from "@/lib/auth-client"

function ResetPasswordForm() {
	const searchParams = useSearchParams()
	const token = searchParams.get("token")
	const email = searchParams.get("email")
	const clearFlag = useAction(api.users.clearMustChangePasswordByEmail)

	const [newPassword, setNewPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	if (!token) {
		return (
			<div className="space-y-5">
				<div className="bg-white border border-destructive/30 rounded-lg p-4">
					<p className="text-sm text-destructive">
						Lien de réinitialisation invalide ou expiré. Veuillez refaire une demande.
					</p>
				</div>
				<Link
					href="/forgot-password"
					className="block text-center text-xs text-[#2E6965] hover:text-[#063238] tracking-wider uppercase font-medium transition-colors duration-150"
				>
					Nouvelle demande
				</Link>
			</div>
		)
	}

	const validatePassword = (pwd: string): string | null => {
		if (pwd.length < 8) return "Le mot de passe doit contenir au moins 8 caractères."
		if (!/[A-Z]/.test(pwd)) return "Le mot de passe doit contenir au moins une majuscule."
		if (!/[a-z]/.test(pwd)) return "Le mot de passe doit contenir au moins une minuscule."
		if (!/[0-9]/.test(pwd)) return "Le mot de passe doit contenir au moins un chiffre."
		return null
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		const validationError = validatePassword(newPassword)
		if (validationError) {
			setError(validationError)
			return
		}

		if (newPassword !== confirmPassword) {
			setError("Les mots de passe ne correspondent pas.")
			return
		}

		setIsLoading(true)

		try {
			const result = await resetPassword({
				newPassword,
				token: token!,
			})

			if (result.error) {
				setError(result.error.message ?? "Lien expiré ou invalide. Veuillez refaire une demande.")
				setIsLoading(false)
				return
			}

			// Clear mustChangePassword flag if the user had one
			if (email) {
				try {
					await clearFlag({ email, newPassword })
				} catch {
					// Non-blocking — the flag will be cleared on next login via the guard
				}
			}

			setSuccess(true)
		} catch {
			setError("Lien expiré ou invalide. Veuillez refaire une demande.")
		} finally {
			setIsLoading(false)
		}
	}

	if (success) {
		return (
			<div className="space-y-5">
				<div className="bg-white border border-[#2E6965]/30 rounded-lg p-4">
					<p className="text-sm text-[#063238]">
						Votre mot de passe a été réinitialisé avec succès.
					</p>
				</div>
				<Link
					href="/login"
					className="block text-center text-xs text-white bg-[#2E6965] hover:bg-[#063238] tracking-wider uppercase font-medium transition-all duration-150 h-10 rounded-md flex items-center justify-center"
				>
					Se connecter
				</Link>
			</div>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			<div className="space-y-1.5">
				<Label
					htmlFor="new-password"
					className="text-xs uppercase tracking-wider text-muted-foreground font-medium"
				>
					Nouveau mot de passe
				</Label>
				<Input
					id="new-password"
					type="password"
					value={newPassword}
					onChange={(e) => setNewPassword(e.target.value)}
					required
					minLength={8}
					disabled={isLoading}
					className="bg-white border-border/50 focus-visible:ring-[#2E6965]/30 focus-visible:border-[#2E6965] transition-all duration-150"
				/>
			</div>

			<div className="space-y-1.5">
				<Label
					htmlFor="confirm-password"
					className="text-xs uppercase tracking-wider text-muted-foreground font-medium"
				>
					Confirmer le mot de passe
				</Label>
				<Input
					id="confirm-password"
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					required
					minLength={8}
					disabled={isLoading}
					className="bg-white border-border/50 focus-visible:ring-[#2E6965]/30 focus-visible:border-[#2E6965] transition-all duration-150"
				/>
			</div>

			<p className="text-xs text-muted-foreground">
				Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre.
			</p>

			{error && <p className="text-sm text-destructive">{error}</p>}

			<div className="pt-2">
				<Button
					type="submit"
					disabled={isLoading}
					className="w-full bg-[#2E6965] hover:bg-[#063238] text-white font-medium text-xs tracking-wider uppercase transition-all duration-150 h-10"
				>
					{isLoading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
				</Button>
			</div>

			<Link
				href="/login"
				className="block text-center text-xs text-[#2E6965] hover:text-[#063238] tracking-wider uppercase font-medium transition-colors duration-150"
			>
				Retour à la connexion
			</Link>
		</form>
	)
}

export default function ResetPasswordPage() {
	return (
		<div className="min-h-screen flex">
			{/* Panneau gauche — caché sur mobile */}
			<div className="hidden md:flex md:w-1/2 flex-col items-center justify-between bg-[#063238] px-12 py-16 relative overflow-hidden">
				<div
					className="absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage:
							"repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
						backgroundSize: "20px 20px",
					}}
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-[#063238] via-[#0a4a52] to-[#063238] opacity-80" />
				<div className="relative z-10 flex flex-col items-center gap-8 flex-1 justify-center">
					<Image
						src="/logos/v7lvet-emeraude.svg"
						alt="V7LVET"
						width={180}
						height={54}
						priority
						className="brightness-0 invert"
					/>
					<p className="text-white/90 text-sm font-bold tracking-[0.2em] uppercase text-center font-cabin">
						Excellence. Agilité. Confiance.
					</p>
					<div className="w-12 h-px bg-white/20 mt-2" />
				</div>
				<p className="relative z-10 text-white/30 text-xs tracking-wider uppercase">
					© 2025 V7LVET
				</p>
			</div>

			{/* Panneau droit */}
			<div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-[#F4F5F3] px-6 py-16">
				<div className="md:hidden mb-10">
					<Image src="/logos/v7lvet-emeraude.svg" alt="V7LVET" width={140} height={42} priority />
				</div>

				<div className="w-full max-w-sm">
					<div className="mb-8">
						<h1 className="text-2xl font-bold tracking-wider uppercase text-[#063238] font-cabin mb-2">
							Nouveau mot de passe
						</h1>
						<p className="text-xs text-muted-foreground tracking-wide">
							Choisissez un nouveau mot de passe sécurisé
						</p>
					</div>

					<Suspense fallback={<div className="text-sm text-muted-foreground">Chargement...</div>}>
						<ResetPasswordForm />
					</Suspense>
				</div>
			</div>
		</div>
	)
}
