"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"

export default function LoginPage() {
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
				setIsLoading(false)
				return
			}

			// Full page navigation ensures the server component re-renders
			// with the new session cookie, providing a valid initialToken
			// to ConvexBetterAuthProvider — no race condition.
			window.location.href = "/dashboard"
		} catch {
			toast.error("Email ou mot de passe incorrect")
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex">
			{/* Panneau gauche — caché sur mobile */}
			<div className="hidden md:flex md:w-1/2 flex-col items-center justify-between bg-[#063238] px-12 py-16 relative overflow-hidden">
				{/* Texture de fond subtile */}
				<div
					className="absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage:
							"repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
						backgroundSize: "20px 20px",
					}}
				/>

				{/* Gradient de profondeur */}
				<div className="absolute inset-0 bg-gradient-to-br from-[#063238] via-[#0a4a52] to-[#063238] opacity-80" />

				{/* Contenu */}
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

				{/* Copyright */}
				<p className="relative z-10 text-white/30 text-xs tracking-wider uppercase">
					© 2025 V7LVET
				</p>
			</div>

			{/* Panneau droit */}
			<div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-[#F4F5F3] px-6 py-16">
				{/* Logo mobile uniquement */}
				<div className="md:hidden mb-10">
					<Image src="/logos/v7lvet-emeraude.svg" alt="V7LVET" width={140} height={42} priority />
				</div>

				<div className="w-full max-w-sm">
					<div className="mb-8">
						<h1 className="text-2xl font-bold tracking-wider uppercase text-[#063238] font-cabin mb-2">
							Connexion
						</h1>
						<p className="text-xs text-muted-foreground tracking-wide">
							Accédez à votre espace de travail
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-1.5">
							<Label
								htmlFor="email"
								className="text-xs uppercase tracking-wider text-muted-foreground font-medium"
							>
								Adresse email
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="nom@cabinet.fr"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
								disabled={isLoading}
								className="bg-white border-border/50 focus-visible:ring-[#2E6965]/30 focus-visible:border-[#2E6965] transition-all duration-150"
							/>
						</div>

						<div className="space-y-1.5">
							<Label
								htmlFor="password"
								className="text-xs uppercase tracking-wider text-muted-foreground font-medium"
							>
								Mot de passe
							</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="current-password"
								disabled={isLoading}
								className="bg-white border-border/50 focus-visible:ring-[#2E6965]/30 focus-visible:border-[#2E6965] transition-all duration-150"
							/>
						</div>

						<div className="flex justify-end">
							<Link
								href="/forgot-password"
								className="text-xs text-[#2E6965] hover:text-[#063238] tracking-wide transition-colors duration-150"
							>
								Mot de passe oublié ?
							</Link>
						</div>

						<div className="pt-2">
							<Button
								type="submit"
								disabled={isLoading}
								className="w-full bg-[#2E6965] hover:bg-[#063238] text-white font-medium text-xs tracking-wider uppercase transition-all duration-150 h-10"
							>
								{isLoading ? "Connexion en cours..." : "Se connecter"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}
