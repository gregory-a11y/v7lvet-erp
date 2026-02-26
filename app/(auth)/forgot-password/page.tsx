"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "@/lib/auth-client"

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [submitted, setSubmitted] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setIsLoading(true)

		try {
			const result = await requestPasswordReset({
				email,
				redirectTo: "/reset-password",
			})
			console.log("[forgot-password] result:", result)
		} catch (err) {
			console.error("[forgot-password] error:", err)
		} finally {
			setIsLoading(false)
			setSubmitted(true)
		}
	}

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
							Mot de passe oublié
						</h1>
						<p className="text-xs text-muted-foreground tracking-wide">
							Entrez votre email pour recevoir un lien de réinitialisation
						</p>
					</div>

					{submitted ? (
						<div className="space-y-5">
							<div className="bg-white border border-border/50 rounded-lg p-4">
								<p className="text-sm text-[#063238]">
									Si un compte existe avec cette adresse email, vous recevrez un lien de
									réinitialisation dans quelques instants.
								</p>
							</div>
							<Link
								href="/login"
								className="block text-center text-xs text-[#2E6965] hover:text-[#063238] tracking-wider uppercase font-medium transition-colors duration-150"
							>
								Retour à la connexion
							</Link>
						</div>
					) : (
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

							<div className="pt-2">
								<Button
									type="submit"
									disabled={isLoading}
									className="w-full bg-[#2E6965] hover:bg-[#063238] text-white font-medium text-xs tracking-wider uppercase transition-all duration-150 h-10"
								>
									{isLoading ? "Envoi en cours..." : "Envoyer le lien"}
								</Button>
							</div>

							<Link
								href="/login"
								className="block text-center text-xs text-[#2E6965] hover:text-[#063238] tracking-wider uppercase font-medium transition-colors duration-150"
							>
								Retour à la connexion
							</Link>
						</form>
					)}
				</div>
			</div>
		</div>
	)
}
