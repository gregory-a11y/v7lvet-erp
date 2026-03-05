"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { SopPicker } from "@/components/shared/sop-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Id } from "@/convex/_generated/dataModel"
import { useTodoCategories } from "@/lib/hooks/use-lead-options"
import { useTeamMembers } from "@/lib/hooks/use-team-members"
import { useCreateTodo } from "@/lib/hooks/use-todos"

const schema = z.object({
	titre: z.string().min(1, "Le titre est requis"),
	description: z.string().optional(),
	priorite: z.enum(["basse", "normale", "haute", "urgente"]),
	dateEcheance: z.string().optional(),
	assigneId: z.string().optional(),
	categorie: z.string().optional(),
	clientId: z.string().optional(),
	sopIds: z.array(z.string()).optional(),
})

type FormValues = z.infer<typeof schema>

export function NewTodoDialog({
	open,
	onOpenChange,
	clients,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	clients?: { _id: Id<"clients">; raisonSociale: string }[]
}) {
	const { members } = useTeamMembers()
	const categories = useTodoCategories()
	const createTodo = useCreateTodo()

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			titre: "",
			description: "",
			priorite: "normale",
			dateEcheance: "",
			assigneId: "none",
			categorie: "none",
			clientId: "none",
			sopIds: [],
		},
	})

	async function onSubmit(values: FormValues) {
		try {
			const assigneId =
				values.assigneId && values.assigneId !== "none" ? values.assigneId : undefined
			const clientId =
				values.clientId && values.clientId !== "none"
					? (values.clientId as Id<"clients">)
					: undefined
			await createTodo({
				titre: values.titre,
				description: values.description || undefined,
				priorite: values.priorite,
				dateEcheance: values.dateEcheance ? new Date(values.dateEcheance).getTime() : undefined,
				assigneId,
				categorie: values.categorie && values.categorie !== "none" ? values.categorie : undefined,
				clientId,
				sopIds:
					values.sopIds && values.sopIds.length > 0 ? (values.sopIds as Id<"sops">[]) : undefined,
			})
			toast.success("Tâche créée")
			form.reset()
			onOpenChange(false)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Nouvelle tâche</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="titre"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Titre *</FormLabel>
									<FormControl>
										<Input placeholder="Que faut-il faire ?" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea placeholder="Détails..." rows={3} {...field} />
									</FormControl>
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="priorite"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Priorité</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="basse">Basse</SelectItem>
												<SelectItem value="normale">Normale</SelectItem>
												<SelectItem value="haute">Haute</SelectItem>
												<SelectItem value="urgente">Urgente</SelectItem>
											</SelectContent>
										</Select>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="dateEcheance"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Échéance</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="assigneId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Assigné à</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Non assigné" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">Non assigné</SelectItem>
												{members?.map((m) => (
													<SelectItem key={m.userId} value={m.userId}>
														{m.nom ?? m.userId}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="categorie"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Catégorie</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Aucune" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">Aucune</SelectItem>
												{categories?.map((cat) => (
													<SelectItem key={cat._id} value={cat.value}>
														{cat.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormItem>
								)}
							/>
						</div>

						{clients && clients.length > 0 && (
							<FormField
								control={form.control}
								name="clientId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Client (optionnel)</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Aucun client" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">Aucun client</SelectItem>
												{clients.map((c) => (
													<SelectItem key={c._id} value={c._id}>
														{c.raisonSociale}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="sopIds"
							render={({ field }) => (
								<FormItem>
									<FormLabel>SOPs (optionnel)</FormLabel>
									<FormControl>
										<SopPicker
											value={(field.value ?? []) as Id<"sops">[]}
											onChange={(ids) => field.onChange(ids)}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								Annuler
							</Button>
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting ? "Création..." : "Créer"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
