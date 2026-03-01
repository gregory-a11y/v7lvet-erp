"use client"

import { useAction, useMutation } from "convex/react"
import { Check, Loader2, Unplug } from "lucide-react"
import Image from "next/image"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useConnections } from "@/lib/hooks/use-calendar"

export function ConnectionSettings() {
	const { connections } = useConnections()
	const getGoogleUrl = useAction(api.calendarSync.getGoogleOAuthUrl)
	const getMicrosoftUrl = useAction(api.calendarSync.getMicrosoftOAuthUrl)
	const disconnect = useMutation(api.calendar.disconnectCalendar)
	const [loading, setLoading] = useState<"google" | "microsoft" | null>(null)

	const googleConnection = connections?.find((c) => c.provider === "google" && c.isActive)
	const microsoftConnection = connections?.find((c) => c.provider === "microsoft" && c.isActive)

	const handleConnectGoogle = useCallback(async () => {
		setLoading("google")
		try {
			const url = await getGoogleUrl()
			window.location.href = url
		} catch (err) {
			console.error("Erreur connexion Google:", err)
			const message = err instanceof Error ? err.message : "Erreur inconnue"
			toast.error(`Connexion Google échouée : ${message}`)
			setLoading(null)
		}
	}, [getGoogleUrl])

	const handleConnectMicrosoft = useCallback(async () => {
		setLoading("microsoft")
		try {
			const url = await getMicrosoftUrl()
			window.location.href = url
		} catch (err) {
			console.error("Erreur connexion Microsoft:", err)
			const message = err instanceof Error ? err.message : "Erreur inconnue"
			toast.error(`Connexion Microsoft échouée : ${message}`)
			setLoading(null)
		}
	}, [getMicrosoftUrl])

	const handleDisconnect = useCallback(
		async (id: Id<"calendarConnections">) => {
			await disconnect({ id })
		},
		[disconnect],
	)

	return (
		<div className="space-y-3">
			<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Calendriers externes
			</p>
			<div className="space-y-2">
				{/* Google Calendar */}
				<div className="flex items-center justify-between gap-2 rounded-lg border p-3 bg-white">
					<div className="flex items-center gap-2.5 min-w-0">
						<Image
							src="/logos/google-calendar.svg"
							alt="Google Calendar"
							width={24}
							height={24}
							className="shrink-0"
						/>
						<div className="min-w-0">
							<p className="text-sm font-medium leading-tight">Google Calendar</p>
							{googleConnection ? (
								<p className="text-[11px] text-green-600 flex items-center gap-1 truncate">
									<Check className="h-3 w-3 shrink-0" />
									<span className="truncate">{googleConnection.email ?? "Connecté"}</span>
								</p>
							) : (
								<p className="text-[11px] text-muted-foreground">Non connecté</p>
							)}
						</div>
					</div>
					{googleConnection ? (
						<Button
							variant="outline"
							size="icon"
							className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
							onClick={() => handleDisconnect(googleConnection._id as Id<"calendarConnections">)}
							title="Déconnecter"
						>
							<Unplug className="h-3.5 w-3.5" />
						</Button>
					) : (
						<Button
							variant="outline"
							size="sm"
							className="shrink-0 text-xs"
							onClick={handleConnectGoogle}
							disabled={loading === "google"}
						>
							{loading === "google" && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
							Connecter
						</Button>
					)}
				</div>

				{/* Microsoft Outlook — placeholder pour Phase suivante */}
				<div className="flex items-center justify-between gap-2 rounded-lg border p-3 bg-white">
					<div className="flex items-center gap-2.5 min-w-0">
						<Image
							src="/logos/outlook.svg"
							alt="Microsoft Outlook"
							width={24}
							height={24}
							className="shrink-0"
						/>
						<div className="min-w-0">
							<p className="text-sm font-medium leading-tight">Microsoft Outlook</p>
							{microsoftConnection ? (
								<p className="text-[11px] text-green-600 flex items-center gap-1 truncate">
									<Check className="h-3 w-3 shrink-0" />
									<span className="truncate">{microsoftConnection.email ?? "Connecté"}</span>
								</p>
							) : (
								<p className="text-[11px] text-muted-foreground">Non connecté</p>
							)}
						</div>
					</div>
					{microsoftConnection ? (
						<Button
							variant="outline"
							size="icon"
							className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
							onClick={() => handleDisconnect(microsoftConnection._id as Id<"calendarConnections">)}
							title="Déconnecter"
						>
							<Unplug className="h-3.5 w-3.5" />
						</Button>
					) : (
						<Button
							variant="outline"
							size="sm"
							className="shrink-0 text-xs"
							onClick={handleConnectMicrosoft}
							disabled={loading === "microsoft"}
						>
							{loading === "microsoft" && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
							Connecter
						</Button>
					)}
				</div>
			</div>
		</div>
	)
}
