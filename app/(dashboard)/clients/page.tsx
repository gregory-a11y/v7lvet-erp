"use client"

import { useQuery } from "convex/react"
import { Building2, Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
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
	const { isAdmin } = useCurrentUser()
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
					isAdmin ? (
						<Button
							onClick={() => router.push("/clients/new")}
							className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-xs uppercase tracking-wider font-medium"
						>
							<Plus className="mr-2 h-3 w-3" />
							Nouveau client
						</Button>
					) : undefined
				}
			/>

			{/* Filters */}
			<div className="flex items-center gap-3 px-6 py-3 bg-white border-b">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Rechercher par raison sociale..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9 bg-v7-perle border-border/50 focus:border-primary focus:bg-white rounded-md text-sm"
					/>
				</div>
				<Select value={status} onValueChange={setStatus}>
					<SelectTrigger className="w-40 bg-v7-perle border-border/50 rounded-md text-sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tous</SelectItem>
						<SelectItem value="actif">Actifs</SelectItem>
						<SelectItem value="archive">Archivés</SelectItem>
					</SelectContent>
				</Select>
				<span className="ml-auto text-xs text-muted-foreground">
					{clients?.length ?? 0} client{clients?.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Table */}
			<div className="mx-6 mb-6 mt-6">
				{clients === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : clients.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-lg shadow-sm">
						<Building2 className="h-16 w-16 text-v7-emeraude/20 mb-6" />
						<p className="text-sm font-heading tracking-widest uppercase text-foreground">
							Aucun client
						</p>
						<p className="text-sm text-muted-foreground mt-2">
							{isAdmin
								? "Créez votre premier client pour commencer."
								: "Aucun client dans votre portefeuille."}
						</p>
						{isAdmin && (
							<Button
								className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-xs uppercase tracking-wider font-medium"
								onClick={() => router.push("/clients/new")}
							>
								<Plus className="mr-2 h-3 w-3" />
								Nouveau client
							</Button>
						)}
					</div>
				) : (
					<div className="bg-white rounded-lg shadow-sm overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow className="bg-v7-perle hover:bg-v7-perle">
									<TableHead className="text-xs uppercase tracking-wider text-muted-foreground py-3">
										Raison sociale
									</TableHead>
									<TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground py-3">
										Forme juridique
									</TableHead>
									<TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground py-3">
										Catégorie fiscale
									</TableHead>
									<TableHead className="hidden lg:table-cell text-xs uppercase tracking-wider text-muted-foreground py-3">
										Ville
									</TableHead>
									<TableHead className="text-xs uppercase tracking-wider text-muted-foreground py-3">
										Statut
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{clients.map((client) => (
									<TableRow
										key={client._id}
										className="cursor-pointer bg-white hover:bg-v7-perle/40 transition-colors duration-100"
										onClick={() => router.push(`/clients/${client._id}`)}
									>
										<TableCell className="font-medium text-foreground">
											<Building2 className="h-3 w-3 text-muted-foreground/50 inline mr-1" />
											{client.raisonSociale}
										</TableCell>
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
											{client.status === "actif" ? (
												<span className="bg-v7-emeraude/10 text-v7-emeraude border border-v7-emeraude/20 rounded-sm text-xs px-2 py-0.5 font-medium uppercase tracking-wider">
													{STATUS_LABELS[client.status] ?? client.status}
												</span>
											) : (
												<span className="bg-muted text-muted-foreground border border-border rounded-sm text-xs px-2 py-0.5 uppercase tracking-wider">
													{STATUS_LABELS[client.status] ?? client.status}
												</span>
											)}
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
