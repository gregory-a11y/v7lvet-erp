"use client"

import { ArrowLeft, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { TodoDetailCard } from "@/components/todos/todo-detail-card"
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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { useRemoveTodo, useTodo } from "@/lib/hooks/use-todos"

export default function TodoDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { role } = useCurrentUser()
	const todo = useTodo(id as Id<"todos">)
	const removeTodo = useRemoveTodo()

	const canDelete = role === "admin" || role === "manager"

	if (todo === undefined) {
		return (
			<div className="p-6 space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}

	if (todo === null) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<p className="text-lg">Tâche non trouvée</p>
				<Button variant="outline" className="mt-4" onClick={() => router.push("/taches")}>
					Retour aux tâches
				</Button>
			</div>
		)
	}

	async function handleDelete() {
		try {
			await removeTodo(id as Id<"todos">)
			toast.success("Tâche supprimée")
			router.push("/taches")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<div>
			<PageHeader
				title={todo.titre}
				description={todo.clientName ?? undefined}
				actions={
					<div className="flex gap-2 items-center">
						<Button variant="ghost" size="sm" onClick={() => router.back()}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Retour
						</Button>

						{canDelete && (
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" size="sm">
										<Trash2 className="mr-2 h-4 w-4" />
										Supprimer
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
										<AlertDialogDescription>
											La tâche et ses sous-tâches seront définitivement supprimées.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Annuler</AlertDialogCancel>
										<AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}
					</div>
				}
			/>

			<div className="p-6 max-w-2xl">
				<TodoDetailCard todo={todo} />
			</div>
		</div>
	)
}
