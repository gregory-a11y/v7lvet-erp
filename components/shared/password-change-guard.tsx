"use client"

import { useAction } from "convex/react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/convex/_generated/api"
import { changePassword } from "@/lib/auth-client"
import { useCurrentUserContext } from "@/lib/contexts/current-user"

export function PasswordChangeGuard({ children }: { children: React.ReactNode }) {
	const { mustChangePassword } = useCurrentUserContext()
	const verifyAndClear = useAction(api.users.verifyAndClearMustChangePassword)

	const [currentPassword, setCurrentPassword] = useState("")
	const [newPassword, setNewPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	if (!mustChangePassword) return <>{children}</>

	const criteria = {
		minLength: newPassword.length >= 8,
		hasUppercase: /[A-Z]/.test(newPassword),
		hasLowercase: /[a-z]/.test(newPassword),
		hasNumber: /[0-9]/.test(newPassword),
	}
	const allValid =
		criteria.minLength && criteria.hasUppercase && criteria.hasLowercase && criteria.hasNumber

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError(null)

		if (!allValid) {
			setError("Le mot de passe ne respecte pas tous les critères.")
			return
		}

		if (newPassword !== confirmPassword) {
			setError("Les mots de passe ne correspondent pas.")
			return
		}

		setIsSubmitting(true)

		try {
			const result = await changePassword({
				currentPassword,
				newPassword,
			})

			if (result.error) {
				setError(result.error.message ?? "Erreur lors du changement de mot de passe.")
				setIsSubmitting(false)
				return
			}

			await verifyAndClear({ newPassword })
			toast.success("Mot de passe modifié avec succès.")
		} catch {
			setError("Erreur lors du changement de mot de passe.")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<>
			{children}
			<Dialog open={true} onOpenChange={() => {}}>
				<DialogContent
					className="sm:max-w-md [&>button]:hidden"
					onPointerDownOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
					onInteractOutside={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle>{"Changement de mot de passe requis"}</DialogTitle>
						<DialogDescription>
							{
								"Pour des raisons de sécurité, vous devez changer votre mot de passe lors de votre première connexion."
							}
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="current-password">{"Mot de passe actuel"}</Label>
							<Input
								id="current-password"
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-password">{"Nouveau mot de passe"}</Label>
							<Input
								id="new-password"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								minLength={8}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">{"Confirmer le nouveau mot de passe"}</Label>
							<Input
								id="confirm-password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								minLength={8}
								required
							/>
						</div>

						{newPassword.length > 0 && (
							<div className="space-y-1.5 text-xs">
								<p className={criteria.minLength ? "text-emerald-600" : "text-muted-foreground"}>
									{criteria.minLength ? "\u2713" : "\u25CB"} 8 caractères minimum
								</p>
								<p className={criteria.hasUppercase ? "text-emerald-600" : "text-muted-foreground"}>
									{criteria.hasUppercase ? "\u2713" : "\u25CB"} Une majuscule
								</p>
								<p className={criteria.hasLowercase ? "text-emerald-600" : "text-muted-foreground"}>
									{criteria.hasLowercase ? "\u2713" : "\u25CB"} Une minuscule
								</p>
								<p className={criteria.hasNumber ? "text-emerald-600" : "text-muted-foreground"}>
									{criteria.hasNumber ? "\u2713" : "\u25CB"} Un chiffre
								</p>
							</div>
						)}

						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button type="submit" className="w-full" disabled={isSubmitting || !allValid}>
							{isSubmitting ? "Changement en cours..." : "Changer le mot de passe"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</>
	)
}
