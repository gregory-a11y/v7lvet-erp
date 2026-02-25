"use client"

import { useSession } from "@/lib/auth-client"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS } from "@/lib/constants"

const ROLE_LABELS: Record<string, string> = {
	associe: "Associé",
	manager: "Manager",
	collaborateur: "Collaborateur",
	assistante: "Assistante",
}

export default function EquipePage() {
	const { data: session } = useSession()
	const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

	return (
		<div>
			<PageHeader
				title="Équipe"
				description="Gestion des membres du cabinet"
			/>

			<div className="p-6 space-y-6">
				{session?.user && (
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Mon profil</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Nom</span>
								<span className="font-medium">{session.user.name}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Email</span>
								<span className="font-medium">{session.user.email}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Rôle</span>
								<Badge variant="secondary">
									{ROLE_LABELS[userRole ?? ""] ?? STATUS_LABELS[userRole ?? ""] ?? userRole ?? "—"}
								</Badge>
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-muted-foreground">
							La gestion d'équipe complète sera disponible prochainement.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
