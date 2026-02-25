"use client"

import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { api } from "@/convex/_generated/api"
import {
	ACTIVITES,
	CATEGORIES_FISCALES,
	FORMES_JURIDIQUES,
	FREQUENCES_TVA,
	REGIMES_FISCAUX,
	REGIMES_TVA,
} from "@/lib/constants"

export default function NewClientPage() {
	const router = useRouter()
	const createClient = useMutation(api.clients.create)
	const [isLoading, setIsLoading] = useState(false)

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setIsLoading(true)

		const form = new FormData(e.currentTarget)
		const get = (key: string) => {
			const val = form.get(key) as string
			return val?.trim() || undefined
		}
		const getNum = (key: string) => {
			const val = form.get(key) as string
			return val ? Number(val) : undefined
		}
		const getBool = (key: string) => {
			return form.get(key) === "on" ? true : undefined
		}

		try {
			const clientId = await createClient({
				raisonSociale: get("raisonSociale")!,
				siren: get("siren"),
				siret: get("siret"),
				adresseRue: get("adresseRue"),
				adresseVille: get("adresseVille"),
				adresseCodePostal: get("adresseCodePostal"),
				telephone: get("telephone"),
				email: get("email"),
				formeJuridique: get("formeJuridique"),
				activite: get("activite"),
				categorieFiscale: get("categorieFiscale"),
				regimeFiscal: get("regimeFiscal"),
				regimeTVA: get("regimeTVA"),
				frequenceTVA: get("frequenceTVA"),
				jourTVA: getNum("jourTVA"),
				dateClotureComptable: get("dateClotureComptable"),
				caN1: getNum("caN1"),
				paiementISUnique: getBool("paiementISUnique"),
				montantCFEN1: getNum("montantCFEN1"),
				montantCVAEN1: getNum("montantCVAEN1"),
				montantTSN1: getNum("montantTSN1"),
				nombreEmployes: getNum("nombreEmployes"),
				proprietaire: getBool("proprietaire"),
				localPro: getBool("localPro"),
				secteur: get("secteur"),
				surfaceCommerciale: getNum("surfaceCommerciale"),
				departement: get("departement"),
				taxeFonciere: getBool("taxeFonciere"),
				tve: getBool("tve"),
				notes: get("notes"),
			})
			toast.success("Client créé avec succès")
			router.push(`/clients/${clientId}`)
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur lors de la création")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div>
			<PageHeader title="Nouveau client" description="Créer une fiche client complète" />
			<form onSubmit={handleSubmit} className="space-y-6 p-6 max-w-3xl">
				{/* Section 1: Identification */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Identification</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="sm:col-span-2">
							<Label htmlFor="raisonSociale">Raison sociale *</Label>
							<Input id="raisonSociale" name="raisonSociale" required />
						</div>
						<div>
							<Label htmlFor="siren">SIREN</Label>
							<Input id="siren" name="siren" maxLength={9} placeholder="9 chiffres" />
						</div>
						<div>
							<Label htmlFor="siret">SIRET</Label>
							<Input id="siret" name="siret" maxLength={14} placeholder="14 chiffres" />
						</div>
						<div className="sm:col-span-2">
							<Label htmlFor="adresseRue">Adresse</Label>
							<Input id="adresseRue" name="adresseRue" />
						</div>
						<div>
							<Label htmlFor="adresseVille">Ville</Label>
							<Input id="adresseVille" name="adresseVille" />
						</div>
						<div>
							<Label htmlFor="adresseCodePostal">Code postal</Label>
							<Input id="adresseCodePostal" name="adresseCodePostal" maxLength={5} />
						</div>
						<div>
							<Label htmlFor="telephone">Téléphone</Label>
							<Input id="telephone" name="telephone" type="tel" />
						</div>
						<div>
							<Label htmlFor="email">Email</Label>
							<Input id="email" name="email" type="email" />
						</div>
					</CardContent>
				</Card>

				{/* Section 2: Juridique */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Juridique</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div>
							<Label>Forme juridique</Label>
							<Select name="formeJuridique">
								<SelectTrigger>
									<SelectValue placeholder="Sélectionner" />
								</SelectTrigger>
								<SelectContent>
									{FORMES_JURIDIQUES.map((f) => (
										<SelectItem key={f.value} value={f.value}>
											{f.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Activité</Label>
							<Select name="activite">
								<SelectTrigger>
									<SelectValue placeholder="Sélectionner" />
								</SelectTrigger>
								<SelectContent>
									{ACTIVITES.map((a) => (
										<SelectItem key={a.value} value={a.value}>
											{a.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				{/* Section 3: Fiscal */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Fiscal</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div>
							<Label>Catégorie fiscale</Label>
							<Select name="categorieFiscale">
								<SelectTrigger>
									<SelectValue placeholder="Sélectionner" />
								</SelectTrigger>
								<SelectContent>
									{CATEGORIES_FISCALES.map((c) => (
										<SelectItem key={c.value} value={c.value}>
											{c.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Régime fiscal</Label>
							<Select name="regimeFiscal">
								<SelectTrigger>
									<SelectValue placeholder="Sélectionner" />
								</SelectTrigger>
								<SelectContent>
									{REGIMES_FISCAUX.map((r) => (
										<SelectItem key={r.value} value={r.value}>
											{r.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Régime TVA</Label>
							<Select name="regimeTVA">
								<SelectTrigger>
									<SelectValue placeholder="Sélectionner" />
								</SelectTrigger>
								<SelectContent>
									{REGIMES_TVA.map((r) => (
										<SelectItem key={r.value} value={r.value}>
											{r.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Fréquence TVA</Label>
							<Select name="frequenceTVA">
								<SelectTrigger>
									<SelectValue placeholder="Sélectionner" />
								</SelectTrigger>
								<SelectContent>
									{FREQUENCES_TVA.map((f) => (
										<SelectItem key={f.value} value={f.value}>
											{f.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="jourTVA">Jour TVA (après fin de période)</Label>
							<Input id="jourTVA" name="jourTVA" type="number" min={0} max={31} />
						</div>
						<div>
							<Label htmlFor="dateClotureComptable">Date de clôture (JJ/MM)</Label>
							<Input
								id="dateClotureComptable"
								name="dateClotureComptable"
								placeholder="31/12"
								maxLength={5}
							/>
						</div>
						<div>
							<Label htmlFor="caN1">CA N-1</Label>
							<Input id="caN1" name="caN1" type="number" min={0} />
						</div>
						<div className="flex items-center gap-2 pt-6">
							<input
								id="paiementISUnique"
								name="paiementISUnique"
								type="checkbox"
								className="h-4 w-4"
							/>
							<Label htmlFor="paiementISUnique" className="text-sm">
								Paiement IS unique
							</Label>
						</div>
					</CardContent>
				</Card>

				{/* Section 4: Taxes */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Taxes & Cotisations</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div>
							<Label htmlFor="montantCFEN1">Montant CFE N-1</Label>
							<Input id="montantCFEN1" name="montantCFEN1" type="number" min={0} />
						</div>
						<div>
							<Label htmlFor="montantCVAEN1">Montant CVAE N-1</Label>
							<Input id="montantCVAEN1" name="montantCVAEN1" type="number" min={0} />
						</div>
						<div>
							<Label htmlFor="montantTSN1">Montant TS N-1</Label>
							<Input id="montantTSN1" name="montantTSN1" type="number" min={0} />
						</div>
						<div>
							<Label htmlFor="nombreEmployes">Nombre d'employés</Label>
							<Input id="nombreEmployes" name="nombreEmployes" type="number" min={0} />
						</div>
						<div>
							<Label htmlFor="secteur">Secteur</Label>
							<Input id="secteur" name="secteur" />
						</div>
						<div>
							<Label htmlFor="surfaceCommerciale">Surface commerciale (m²)</Label>
							<Input id="surfaceCommerciale" name="surfaceCommerciale" type="number" min={0} />
						</div>
						<div>
							<Label htmlFor="departement">Département</Label>
							<Input id="departement" name="departement" maxLength={3} placeholder="75" />
						</div>
						<div className="space-y-3 pt-2">
							<div className="flex items-center gap-2">
								<input id="proprietaire" name="proprietaire" type="checkbox" className="h-4 w-4" />
								<Label htmlFor="proprietaire" className="text-sm">
									Propriétaire des locaux
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<input id="localPro" name="localPro" type="checkbox" className="h-4 w-4" />
								<Label htmlFor="localPro" className="text-sm">
									Local professionnel
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<input id="taxeFonciere" name="taxeFonciere" type="checkbox" className="h-4 w-4" />
								<Label htmlFor="taxeFonciere" className="text-sm">
									Taxe foncière
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<input id="tve" name="tve" type="checkbox" className="h-4 w-4" />
								<Label htmlFor="tve" className="text-sm">
									TVE (taxe véhicules)
								</Label>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Section 5: Notes */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<Textarea
							id="notes"
							name="notes"
							rows={3}
							placeholder="Informations complémentaires..."
						/>
					</CardContent>
				</Card>

				<div className="flex gap-3">
					<Button type="submit" disabled={isLoading}>
						{isLoading ? "Création..." : "Créer le client"}
					</Button>
					<Button type="button" variant="outline" onClick={() => router.back()}>
						Annuler
					</Button>
				</div>
			</form>
		</div>
	)
}
