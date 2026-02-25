"use client"

import { useQuery } from "convex/react"
import { Download, FileText } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

function formatFileSize(bytes?: number): string {
	if (!bytes) return "—"
	if (bytes < 1024) return `${bytes} o`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function DownloadButton({ storageId }: { storageId: string }) {
	const url = useQuery(api.documents.getDownloadUrl, { storageId })

	if (!url) return null

	return (
		<Button variant="ghost" size="icon" asChild className="h-8 w-8">
			<a href={url} target="_blank" rel="noopener noreferrer">
				<Download className="h-4 w-4" />
			</a>
		</Button>
	)
}

export default function DocumentsPage() {
	const documents = useQuery(api.documents.list)

	return (
		<div>
			<PageHeader title="Documents" description="Tous les documents du cabinet" />

			<div className="px-6 py-4">
				{documents === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : documents.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">Aucun document</p>
						<p className="text-sm text-muted-foreground mt-1">
							Les documents sont ajoutés depuis les fiches clients.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nom</TableHead>
									<TableHead>Client</TableHead>
									<TableHead className="hidden md:table-cell">Catégorie</TableHead>
									<TableHead className="hidden md:table-cell">Taille</TableHead>
									<TableHead className="hidden md:table-cell">Date</TableHead>
									<TableHead className="w-16">Ouvrir</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{documents.map((doc) => (
									<TableRow key={doc._id}>
										<TableCell className="font-medium">{doc.nom}</TableCell>
										<TableCell className="text-muted-foreground">{doc.clientName}</TableCell>
										<TableCell className="hidden md:table-cell">
											{doc.categorieName ? (
												<Badge variant="secondary">{doc.categorieName}</Badge>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{formatFileSize(doc.fileSize)}
										</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{formatDate(doc.createdAt)}
										</TableCell>
										<TableCell>
											<DownloadButton storageId={doc.storageId} />
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
