"use client"

import { useQuery } from "convex/react"
import { Building2, Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import { CATEGORIES_FISCALES, STATUS_LABELS } from "@/lib/constants"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export default function ClientsPage() {
	const router = useRouter()
	const { isAssociate } = useCurrentUser()
	const [status, setStatus] = useState<string>("actif")
	const [search, setSearch] = useState("")

	const clients = useQuery(api.clients.list, {
		status: status === "all" ? undefined : status,
		search: search.length > 0 ? search : undefined,
	})

	return (
		<div>
			<PageHeader
				title="Clients"
				description="Gestion des entreprises clientes du cabinet"
				actions={
					isAssociate ? (
						<Button onClick={() => router.push("/clients/new")}>
							<Plus className="mr-2 h-4 w-4" />
							Nouveau client
						</Button>
					) : undefined
				}
			/>

			{/* Filters */}
			<div className="flex items-center gap-3 px-6 py-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Rechercher par raison sociale..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={status} onValueChange={setStatus}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous</SelectItem>
						<SelectItem value="actif">Actifs</SelectItem>
						<SelectItem value="archive">Archivés</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="px-6">
				{clients === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : clients.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">Aucun client</p>
						<p className="text-sm text-muted-foreground mt-1">
							{isAssociate
								? "Créez votre premier client pour commencer."
								: "Aucun client dans votre portefeuille."}
						</p>
						{isAssociate && (
							<Button className="mt-4" onClick={() => router.push("/clients/new")}>
								<Plus className="mr-2 h-4 w-4" />
								Nouveau client
							</Button>
						)}
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Raison sociale</TableHead>
									<TableHead className="hidden md:table-cell">Forme juridique</TableHead>
									<TableHead className="hidden md:table-cell">Catégorie fiscale</TableHead>
									<TableHead className="hidden lg:table-cell">Ville</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{clients.map((client) => (
									<TableRow
										key={client._id}
										className="cursor-pointer"
										onClick={() => router.push(`/clients/${client._id}`)}
									>
										<TableCell className="font-medium">{client.raisonSociale}</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{client.formeJuridique ?? "—"}
										</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{CATEGORIES_FISCALES.find((c) => c.value === client.categorieFiscale)
												?.label ?? "—"}
										</TableCell>
										<TableCell className="hidden lg:table-cell text-muted-foreground">
											{client.adresseVille ?? "—"}
										</TableCell>
										<TableCell>
											<Badge variant={client.status === "actif" ? "default" : "secondary"}>
												{STATUS_LABELS[client.status] ?? client.status}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</div>
	)
}
