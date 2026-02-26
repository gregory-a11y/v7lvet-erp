"use client"

import { useMutation, useQuery } from "convex/react"
import { BookOpen, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export default function SopsPage() {
	const router = useRouter()
	const { role: userRole } = useCurrentUser()
	const sops = useQuery(api.sops.list, { includeInactive: true })
	const remove = useMutation(api.sops.remove)

	const canManage = userRole === "admin" || userRole === "manager"

	async function handleRemove(id: Id<"sops">, nom: string) {
		try {
			await remove({ id })
			toast.success(`"${nom}" supprimée`)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div>
			<PageHeader
				title="SOPs"
				description="Procédures opérationnelles standards"
				actions={
					canManage ? (
						<Button onClick={() => router.push("/sops/new")}>
							<Plus className="mr-2 h-4 w-4" />
							Nouvelle SOP
						</Button>
					) : undefined
				}
			/>

			<div className="px-6 pt-4">
				{sops === undefined ? (
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : sops.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">Aucune SOP</p>
						<p className="text-sm text-muted-foreground mt-1">
							Créez des procédures pour standardiser le travail de l'équipe.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nom</TableHead>
									<TableHead className="hidden md:table-cell">Catégorie</TableHead>
									<TableHead className="hidden md:table-cell">Statut</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sops.map((sop) => (
									<TableRow
										key={sop._id}
										className="cursor-pointer"
										onClick={() => router.push(`/sops/${sop._id}`)}
									>
										<TableCell className="font-medium">{sop.nom}</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											{sop.categorie ?? "—"}
										</TableCell>
										<TableCell className="hidden md:table-cell">
											<Badge variant={sop.isActive ? "default" : "secondary"}>
												{sop.isActive ? "Active" : "Inactive"}
											</Badge>
										</TableCell>
										<TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
											{canManage && (
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button size="sm" variant="ghost" className="h-7 text-destructive">
															<Trash2 className="h-3 w-3" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>Supprimer "{sop.nom}" ?</AlertDialogTitle>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Annuler</AlertDialogCancel>
															<AlertDialogAction onClick={() => handleRemove(sop._id, sop.nom)}>
																Supprimer
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
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
