"use client"

import { ShieldX } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { hasAccessToRoute } from "@/lib/permissions"

export function SectionGuard({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const { sections, isLoading, isAuthenticated } = useCurrentUser()

	if (isLoading) return null

	if (isAuthenticated && !hasAccessToRoute(pathname, sections)) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-4">
				<ShieldX size={48} className="text-muted-foreground/40" />
				<h2 className="text-xl font-semibold">{"Accès non autorisé"}</h2>
				<p className="text-muted-foreground">
					{"Vous n'avez pas les permissions pour accéder à cette section."}
				</p>
				<Button asChild>
					<Link href="/dashboard">Retour au tableau de bord</Link>
				</Button>
			</div>
		)
	}

	return <>{children}</>
}
