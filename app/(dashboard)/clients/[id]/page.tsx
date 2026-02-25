"use client"

import { useMutation, useQuery } from "convex/react"
import { Archive } from "lucide-react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useSession } from "@/lib/auth-client"
import {
	ACTIVITES,
	CATEGORIES_FISCALES,
	FREQUENCES_TVA,
	REGIMES_FISCAUX,
	REGIMES_TVA,
	STATUS_LABELS,
} from "@/lib/constants"
import { ContactsTab } from "./contacts-tab"
import { DossiersTab } from "./dossiers-tab"
import { RunsTab } from "./runs-tab"
import { TicketsTab } from "./tickets-tab"

function InfoRow({
	label,
	value,
}: {
	label: string
	value: string | number | boolean | undefined | null
}) {
	if (value === undefined || value === null) return null
	const display = typeof value === "boolean" ? (value ? "Oui" : "Non") : String(value)
	return (
		<div className="flex justify-between py-1.5">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium">{display}</span>
		</div>
	)
}

function findLabel(
	options: readonly { value: string; label: string }[],
	value: string | undefined,
): string | undefined {
	if (!value) return undefined
	return options.find((o) => o.value === value)?.label ?? value
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { data: session } = useSession()
	const client = useQuery(api.clients.getById, { id: id as Id<"clients"> })
	const archiveClient = useMutation(api.clients.archive)

	const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
	const isAssociate = userRole === "associe"

	if (client === undefined) {
		return (
			<div className="p-6 space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}

	if (client === null) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<p className="text-lg">Client non trouvé</p>
				<Button variant="outline" className="mt-4" onClick={() => router.push("/clients")}>
					Retour à la liste
				</Button>
			</div>
		)
	}

	async function handleArchive() {
		try {
			await archiveClient({ id: id as Id<"clients"> })
			toast.success("Client archivé")
			router.push("/clients")
		} catch {
			toast.error("Erreur lors de l'archivage")
		}
	}

	return (
		<div>
			<PageHeader
				title={client.raisonSociale}
				description={`${client.formeJuridique ?? ""} — ${findLabel(CATEGORIES_FISCALES, client.categorieFiscale) ?? ""}`}
				actions={
					<div className="flex gap-2">
						{isAssociate && client.status === "actif" && (
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="outline" size="sm">
										<Archive className="mr-2 h-4 w-4" />
										Archiver
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Archiver ce client ?</AlertDialogTitle>
										<AlertDialogDescription>
											Le client sera archivé et n'apparaîtra plus dans la liste active. Cette action
											est réversible.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Annuler</AlertDialogCancel>
										<AlertDialogAction onClick={handleArchive}>Archiver</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}
						<Badge variant={client.status === "actif" ? "default" : "secondary"}>
							{STATUS_LABELS[client.status]}
						</Badge>
					</div>
				}
			/>

			<div className="p-6">
				<Tabs defaultValue="informations">
					<TabsList>
						<TabsTrigger value="informations">Informations</TabsTrigger>
						<TabsTrigger value="contacts">Contacts</TabsTrigger>
						<TabsTrigger value="dossiers">Dossiers</TabsTrigger>
						<TabsTrigger value="runs">Runs</TabsTrigger>
						<TabsTrigger value="tickets">Tickets</TabsTrigger>
					</TabsList>

					<TabsContent value="informations" className="mt-6 space-y-6">
						<div className="grid gap-6 md:grid-cols-2">
							{/* Identification */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Identification</CardTitle>
								</CardHeader>
								<CardContent className="space-y-0">
									<InfoRow label="Raison sociale" value={client.raisonSociale} />
									<InfoRow label="SIREN" value={client.siren} />
									<InfoRow label="SIRET" value={client.siret} />
									<InfoRow label="Adresse" value={client.adresseRue} />
									<InfoRow label="Ville" value={client.adresseVille} />
									<InfoRow label="Code postal" value={client.adresseCodePostal} />
									<InfoRow label="Téléphone" value={client.telephone} />
									<InfoRow label="Email" value={client.email} />
								</CardContent>
							</Card>

							{/* Juridique */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Juridique</CardTitle>
								</CardHeader>
								<CardContent className="space-y-0">
									<InfoRow label="Forme juridique" value={client.formeJuridique} />
									<InfoRow label="Activité" value={findLabel(ACTIVITES, client.activite)} />
								</CardContent>
							</Card>

							{/* Fiscal */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Fiscal</CardTitle>
								</CardHeader>
								<CardContent className="space-y-0">
									<InfoRow
										label="Catégorie fiscale"
										value={findLabel(CATEGORIES_FISCALES, client.categorieFiscale)}
									/>
									<InfoRow
										label="Régime fiscal"
										value={findLabel(REGIMES_FISCAUX, client.regimeFiscal)}
									/>
									<InfoRow label="Régime TVA" value={findLabel(REGIMES_TVA, client.regimeTVA)} />
									<InfoRow
										label="Fréquence TVA"
										value={findLabel(FREQUENCES_TVA, client.frequenceTVA)}
									/>
									<InfoRow label="Jour TVA" value={client.jourTVA} />
									<InfoRow label="Clôture comptable" value={client.dateClotureComptable} />
									<InfoRow label="CA N-1" value={client.caN1?.toLocaleString("fr-FR")} />
									<InfoRow label="Paiement IS unique" value={client.paiementISUnique} />
								</CardContent>
							</Card>

							{/* Taxes */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Taxes & Cotisations</CardTitle>
								</CardHeader>
								<CardContent className="space-y-0">
									<InfoRow
										label="Montant CFE N-1"
										value={client.montantCFEN1?.toLocaleString("fr-FR")}
									/>
									<InfoRow
										label="Montant CVAE N-1"
										value={client.montantCVAEN1?.toLocaleString("fr-FR")}
									/>
									<InfoRow
										label="Montant TS N-1"
										value={client.montantTSN1?.toLocaleString("fr-FR")}
									/>
									<InfoRow label="Nombre d'employés" value={client.nombreEmployes} />
									<InfoRow label="Propriétaire" value={client.proprietaire} />
									<InfoRow label="Local pro" value={client.localPro} />
									<InfoRow label="Secteur" value={client.secteur} />
									<InfoRow
										label="Surface commerciale"
										value={
											client.surfaceCommerciale ? `${client.surfaceCommerciale} m²` : undefined
										}
									/>
									<InfoRow label="Département" value={client.departement} />
									<InfoRow label="Taxe foncière" value={client.taxeFonciere} />
									<InfoRow label="TVE" value={client.tve} />
								</CardContent>
							</Card>
						</div>

						{client.notes && (
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Notes</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-sm whitespace-pre-wrap">{client.notes}</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value="contacts" className="mt-6">
						<ContactsTab clientId={id as Id<"clients">} />
					</TabsContent>

					<TabsContent value="dossiers" className="mt-6">
						<DossiersTab clientId={id as Id<"clients">} />
					</TabsContent>

					<TabsContent value="runs" className="mt-6">
						<RunsTab clientId={id as Id<"clients">} />
					</TabsContent>

					<TabsContent value="tickets" className="mt-6">
						<TicketsTab clientId={id as Id<"clients">} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
