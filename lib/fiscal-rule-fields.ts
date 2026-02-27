// ─── Client fields available for conditions ──────────────────────────────────

export type FieldType = "select" | "number" | "boolean" | "text"

export interface ClientField {
	value: string
	label: string
	type: FieldType
	options?: Array<{ value: string; label: string }>
}

export const CLIENT_FIELDS: ClientField[] = [
	{
		value: "regimeTVA",
		label: "Régime TVA",
		type: "select",
		options: [
			{ value: "franchise_en_base", label: "Franchise en base" },
			{ value: "reel_normal", label: "Réel normal" },
			{ value: "rsi", label: "RSI" },
			{ value: "exoneree", label: "Exonérée" },
		],
	},
	{
		value: "frequenceTVA",
		label: "Fréquence TVA",
		type: "select",
		options: [
			{ value: "mensuelle", label: "Mensuelle" },
			{ value: "trimestrielle", label: "Trimestrielle" },
			{ value: "annuelle", label: "Annuelle" },
		],
	},
	{ value: "jourTVA", label: "Jour TVA", type: "number" },
	{
		value: "categorieFiscale",
		label: "Catégorie fiscale",
		type: "select",
		options: [
			{ value: "IR-BNC", label: "IR-BNC" },
			{ value: "IR-BIC", label: "IR-BIC" },
			{ value: "IR-RF", label: "IR-RF" },
			{ value: "IS", label: "IS" },
		],
	},
	{
		value: "regimeFiscal",
		label: "Régime fiscal",
		type: "select",
		options: [
			{ value: "reel_normal", label: "Réel normal" },
			{ value: "reel_simplifie", label: "Réel simplifié" },
			{ value: "reel_complet", label: "Réel complet" },
			{ value: "micro", label: "Micro" },
		],
	},
	{
		value: "formeJuridique",
		label: "Forme juridique",
		type: "select",
		options: [
			{ value: "SARL", label: "SARL" },
			{ value: "SAS", label: "SAS" },
			{ value: "SA", label: "SA" },
			{ value: "SASU", label: "SASU" },
			{ value: "EI", label: "EI" },
			{ value: "SNC", label: "SNC" },
			{ value: "SCI", label: "SCI" },
			{ value: "EURL", label: "EURL" },
			{ value: "SELARL", label: "SELARL" },
			{ value: "SCM", label: "SCM" },
			{ value: "SCP", label: "SCP" },
			{ value: "Auto-entrepreneur", label: "Auto-entrepreneur" },
			{ value: "Micro-entreprise", label: "Micro-entreprise" },
			{ value: "Autre", label: "Autre" },
		],
	},
	{
		value: "activite",
		label: "Activité",
		type: "select",
		options: [
			{ value: "profession_liberale_medicale", label: "Profession libérale médicale" },
			{ value: "autres_professions_liberales", label: "Autres professions libérales" },
			{
				value: "commerciale_industrielle_artisanale",
				label: "Commerciale / Industrielle / Artisanale",
			},
			{ value: "agricole", label: "Agricole" },
			{ value: "civile", label: "Civile" },
		],
	},
	{ value: "caN1", label: "CA N-1", type: "number" },
	{ value: "paiementISUnique", label: "Paiement IS unique", type: "boolean" },
	{ value: "montantCFEN1", label: "Montant CFE N-1", type: "number" },
	{ value: "montantCVAEN1", label: "Montant CVAE N-1", type: "number" },
	{ value: "montantTSN1", label: "Montant TS N-1", type: "number" },
	{ value: "nombreEmployes", label: "Nombre d'employés", type: "number" },
	{ value: "proprietaire", label: "Propriétaire", type: "boolean" },
	{ value: "localPro", label: "Local professionnel", type: "boolean" },
	{
		value: "secteur",
		label: "Secteur",
		type: "select",
		options: [
			{ value: "Commerce & Distribution", label: "Commerce & Distribution" },
			{ value: "Services", label: "Services" },
			{ value: "Industrie", label: "Industrie" },
			{ value: "BTP", label: "BTP" },
			{ value: "Immobilier", label: "Immobilier" },
			{ value: "Santé", label: "Santé" },
			{ value: "Autre", label: "Autre" },
		],
	},
	{ value: "surfaceCommerciale", label: "Surface commerciale (m²)", type: "number" },
	{ value: "departement", label: "Département", type: "text" },
	{ value: "taxeFonciere", label: "Taxe foncière", type: "boolean" },
	{ value: "tve", label: "TVE", type: "boolean" },
]

// ─── Operators ───────────────────────────────────────────────────────────────

export interface Operator {
	value: string
	label: string
	applicableTo: FieldType[]
	needsValue: boolean
}

export const OPERATORS: Operator[] = [
	{ value: "equals", label: "=", applicableTo: ["select", "text", "number"], needsValue: true },
	{ value: "not_equals", label: "≠", applicableTo: ["select", "text", "number"], needsValue: true },
	{ value: "in", label: "dans", applicableTo: ["select", "text"], needsValue: true },
	{ value: "not_in", label: "pas dans", applicableTo: ["select", "text"], needsValue: true },
	{ value: "gt", label: ">", applicableTo: ["number"], needsValue: true },
	{ value: "gte", label: "≥", applicableTo: ["number"], needsValue: true },
	{ value: "lt", label: "<", applicableTo: ["number"], needsValue: true },
	{ value: "lte", label: "≤", applicableTo: ["number"], needsValue: true },
	{ value: "is_true", label: "est vrai", applicableTo: ["boolean"], needsValue: false },
	{ value: "is_false", label: "est faux", applicableTo: ["boolean"], needsValue: false },
	{
		value: "is_set",
		label: "est défini",
		applicableTo: ["select", "text", "number", "boolean"],
		needsValue: false,
	},
	{
		value: "is_not_set",
		label: "n'est pas défini",
		applicableTo: ["select", "text", "number", "boolean"],
		needsValue: false,
	},
	{
		value: "starts_with",
		label: "commence par",
		applicableTo: ["text", "select"],
		needsValue: true,
	},
]

// ─── Date formula types ──────────────────────────────────────────────────────

export const DATE_FORMULA_TYPES = [
	{ value: "fixed", label: "Date fixe", description: "Jour/mois précis dans l'exercice" },
	{
		value: "relative_to_cloture",
		label: "Relative à la clôture",
		description: "N mois/jours après la date de clôture",
	},
	{
		value: "cloture_conditional",
		label: "Conditionnelle clôture",
		description: "Date A si clôture 31/12, sinon date B",
	},
	{
		value: "end_of_month_plus_offset",
		label: "Fin de mois + offset",
		description: "Fin du mois + N jours",
	},
	{
		value: "end_of_quarter_plus_offset",
		label: "Fin de trimestre + offset",
		description: "Fin du trimestre + N jours",
	},
	{
		value: "relative_to_ago",
		label: "Relative à l'AGO",
		description: "N mois/jours après l'AGO (clôture + 6 mois)",
	},
]

// ─── Labels ──────────────────────────────────────────────────────────────────

export const MOIS_LABELS = [
	"Janvier",
	"Février",
	"Mars",
	"Avril",
	"Mai",
	"Juin",
	"Juillet",
	"Août",
	"Septembre",
	"Octobre",
	"Novembre",
	"Décembre",
]

export const TRIMESTRE_LABELS = ["T1", "T2", "T3", "T4"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getFieldByValue(value: string): ClientField | undefined {
	return CLIENT_FIELDS.find((f) => f.value === value)
}

export function getOperatorsForField(fieldValue: string): Operator[] {
	const field = getFieldByValue(fieldValue)
	if (!field) return OPERATORS
	return OPERATORS.filter((op) => op.applicableTo.includes(field.type))
}

export function formatCondition(condition: {
	champ: string
	operateur: string
	valeur?: unknown
}): string {
	const field = getFieldByValue(condition.champ)
	const op = OPERATORS.find((o) => o.value === condition.operateur)
	const fieldLabel = field?.label ?? condition.champ
	const opLabel = op?.label ?? condition.operateur

	if (!op?.needsValue) return `${fieldLabel} ${opLabel}`

	const valeur = condition.valeur
	if (Array.isArray(valeur)) {
		const labels = valeur.map((v) => {
			const opt = field?.options?.find((o) => o.value === v)
			return opt?.label ?? v
		})
		return `${fieldLabel} ${opLabel} [${labels.join(", ")}]`
	}

	if (field?.options) {
		const opt = field.options.find((o) => o.value === valeur)
		return `${fieldLabel} ${opLabel} ${opt?.label ?? valeur}`
	}

	return `${fieldLabel} ${opLabel} ${valeur}`
}
