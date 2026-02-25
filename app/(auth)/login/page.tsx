"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { toast } from "sonner"

export default function LoginPage() {
	const router = useRouter()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setIsLoading(true)

		try {
			const result = await signIn.email({
				email,
				password,
			})

			if (result.error) {
				toast.error("Email ou mot de passe incorrect")
				return
			}

			router.push("/dashboard")
		} catch {
			toast.error("Email ou mot de passe incorrect")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-v7-perle">
			<Card className="w-full max-w-sm border-border/50 shadow-lg">
				<CardHeader className="items-center space-y-4 pb-2">
					<Image
						src="/logos/v7lvet-emeraude.svg"
						alt="V7LVET"
						width={160}
						height={48}
						priority
					/>
					<p className="text-sm text-muted-foreground">
						Connectez-vous à votre espace de travail
					</p>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
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
								autoComplete="current-password"
								disabled={isLoading}
							/>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={isLoading}
						>
							{isLoading ? "Connexion..." : "Se connecter"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
