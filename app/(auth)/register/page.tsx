"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp } from "@/lib/auth-client"

export default function RegisterPage() {
	const router = useRouter()
	const [nom, setNom] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setIsLoading(true)

		try {
			const result = await signUp.email({
				name: nom,
				email,
				password,
			})

			if (result.error) {
				toast.error(result.error.message ?? "Erreur lors de la création du compte")
				return
			}

			toast.success("Compte créé avec succès")
			router.push("/dashboard")
		} catch {
			toast.error("Une erreur est survenue")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-v7-perle">
			<Card className="w-full max-w-sm border-border/50 shadow-lg">
				<CardHeader className="items-center space-y-4 pb-2">
					<Image src="/logos/v7lvet-emeraude.svg" alt="V7LVET" width={160} height={48} priority />
					<p className="text-sm text-muted-foreground">Créer votre compte</p>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="nom">Nom complet</Label>
							<Input
								id="nom"
								type="text"
								placeholder="Prénom Nom"
								value={nom}
								onChange={(e) => setNom(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="nom@cabinet.fr"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
								disabled={isLoading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Mot de passe</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={8}
								autoComplete="new-password"
								disabled={isLoading}
							/>
						</div>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "Création…" : "Créer le compte"}
						</Button>
						<p className="text-center text-sm text-muted-foreground">
							Déjà un compte ?{" "}
							<Link href="/login" className="text-primary underline underline-offset-2">
								Se connecter
							</Link>
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
