"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSources, useTypes } from "@/lib/hooks/use-lead-options"
import { useCreateLead } from "@/lib/hooks/use-leads"
import { usePrestationsCatalog } from "@/lib/hooks/use-prestations"

const schema = z.object({
	contactNom: z.string().min(1, "Le nom est obligatoire"),
	contactPrenom: z.string().optional(),
	contactEmail: z.string().email("Email invalide").optional().or(z.literal("")),
	contactTelephone: z.string().optional(),
	entrepriseRaisonSociale: z.string().optional(),
	entrepriseSiren: z.string().optional(),
	entrepriseFormeJuridique: z.string().optional(),
	source: z.string().optional(),
	sourceDetail: z.string().optional(),
	type: z.string().optional(),
	prestationIds: z.array(z.string()).optional(),
	montantEstime: z.number().optional(),
	notes: z.string().optional(),
	responsableId: z.string().optional(),
	responsableHierarchiqueId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface NewLeadDialogProps {
	teamMembers?: Array<{ userId: string; nom?: string }>
}

export function NewLeadDialog({ teamMembers }: NewLeadDialogProps) {
	const [open, setOpen] = useState(false)
	const createLead = useCreateLead()
	const sources = useSources()
	const types = useTypes()
	const prestationsCatalog = usePrestationsCatalog()

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			contactNom: "",
			contactPrenom: "",
			contactEmail: "",
			contactTelephone: "",
			entrepriseRaisonSociale: "",
			entrepriseSiren: "",
			source: undefined,
			type: undefined,
			prestationIds: [],
			notes: "",
		},
	})

	const onSubmit = async (data: FormData) => {
		try {
			await createLead({
				...data,
				prestationIds: data.prestationIds as any,
				contactEmail: data.contactEmail || undefined,
				montantEstime: data.montantEstime || undefined,
			})
			toast.success("Lead créé avec succès")
			form.reset()
			setOpen(false)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de la création")
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-1.5">
					<Plus className="h-4 w-4" />
					Nouveau lead
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Nouveau lead</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{/* Contact */}
						<div>
							<h3 className="text-sm font-semibold mb-3">Contact</h3>
							<div className="grid grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="contactNom"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nom *</FormLabel>
											<FormControl>
												<Input placeholder="Nom du contact" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="contactPrenom"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Prénom</FormLabel>
											<FormControl>
												<Input placeholder="Prénom" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="contactEmail"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input type="email" placeholder="email@exemple.com" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="contactTelephone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Téléphone</FormLabel>
											<FormControl>
												<Input placeholder="06 12 34 56 78" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Entreprise */}
						<div>
							<h3 className="text-sm font-semibold mb-3">Entreprise</h3>
							<div className="grid grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="entrepriseRaisonSociale"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Raison sociale</FormLabel>
											<FormControl>
												<Input placeholder="Nom de l'entreprise" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="entrepriseSiren"
									render={({ field }) => (
										<FormItem>
											<FormLabel>SIREN</FormLabel>
											<FormControl>
												<Input placeholder="123 456 789" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Qualification */}
						<div>
							<h3 className="text-sm font-semibold mb-3">Qualification</h3>
							<div className="grid grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="source"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Source</FormLabel>
											<Select value={field.value ?? ""} onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Source..." />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{sources?.map((s) => (
														<SelectItem key={s.value} value={s.value}>
															{s.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="type"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Type</FormLabel>
											<Select value={field.value ?? ""} onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Type..." />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{types?.map((t) => (
														<SelectItem key={t.value} value={t.value}>
															{t.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="montantEstime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Montant estimé (€)</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="0"
													{...field}
													onChange={(e) =>
														field.onChange(e.target.value ? Number(e.target.value) : undefined)
													}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="responsableId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Resp. opérationnel</FormLabel>
											<Select value={field.value ?? ""} onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Sélectionner..." />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{teamMembers?.map((m) => (
														<SelectItem key={m.userId} value={m.userId}>
															{m.nom ?? m.userId}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="responsableHierarchiqueId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Resp. hiérarchique</FormLabel>
											<Select value={field.value ?? ""} onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Sélectionner..." />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{teamMembers?.map((m) => (
														<SelectItem key={m.userId} value={m.userId}>
															{m.nom ?? m.userId}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Prestations checkboxes */}
							<FormField
								control={form.control}
								name="prestationIds"
								render={({ field }) => (
									<FormItem className="mt-3">
										<FormLabel>Prestations potentielles</FormLabel>
										<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
											{(prestationsCatalog ?? []).map((p) => (
												<div key={p._id} className="flex items-center gap-2 text-sm">
													<Checkbox
														id={`prestation-${p._id}`}
														checked={field.value?.includes(p._id) ?? false}
														onCheckedChange={(checked) => {
															const current = field.value ?? []
															field.onChange(
																checked ? [...current, p._id] : current.filter((v) => v !== p._id),
															)
														}}
													/>
													<Label
														htmlFor={`prestation-${p._id}`}
														className="cursor-pointer font-normal"
													>
														{p.titre}
													</Label>
												</div>
											))}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Notes */}
						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes</FormLabel>
									<FormControl>
										<Textarea placeholder="Notes internes..." rows={3} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="outline" onClick={() => setOpen(false)}>
								Annuler
							</Button>
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting ? "Création..." : "Créer le lead"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
