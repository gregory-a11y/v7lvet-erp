export const FORMES_JURIDIQUES = [
	{ value: "SARL", label: "SARL" },
	{ value: "SAS", label: "SAS" },
	{ value: "SA", label: "SA" },
	{ value: "SASU", label: "SASU" },
	{ value: "EI", label: "EI" },
	{ value: "EURL", label: "EURL" },
	{ value: "SNC", label: "SNC" },
	{ value: "SCI", label: "SCI" },
	{ value: "SCP", label: "SCP" },
	{ value: "SCM", label: "SCM" },
	{ value: "SELARL", label: "SELARL" },
	{ value: "Auto-entrepreneur", label: "Auto-entrepreneur" },
	{ value: "Micro-entreprise", label: "Micro-entreprise" },
	{ value: "Autre", label: "Autre" },
] as const

export const CATEGORIES_FISCALES = [
	{ value: "IR-BNC", label: "IR - BNC" },
	{ value: "IR-BIC", label: "IR - BIC" },
	{ value: "IR-RF", label: "IR - RF" },
	{ value: "IS", label: "IS" },
] as const

export const REGIMES_FISCAUX = [
	{ value: "micro", label: "Micro" },
	{ value: "reel_simplifie", label: "Réel simplifié" },
	{ value: "reel_normal", label: "Réel normal" },
	{ value: "reel_complet", label: "Réel complet" },
] as const

export const REGIMES_TVA = [
	{ value: "franchise_en_base", label: "Franchise en base de TVA" },
	{ value: "exoneree", label: "Exonérée de TVA" },
	{ value: "reel_normal", label: "Réel normal" },
	{ value: "rsi", label: "Régime réel simplifié (RSI)" },
] as const

export const FREQUENCES_TVA = [
	{ value: "mensuelle", label: "Mensuelle" },
	{ value: "trimestrielle", label: "Trimestrielle" },
	{ value: "annuelle", label: "Annuelle" },
] as const

export const ACTIVITES = [
	{ value: "profession_liberale_medicale", label: "Profession libérale médicale conventionnée" },
	{ value: "autres_professions_liberales", label: "Autres professions libérales" },
	{
		value: "commerciale_industrielle_artisanale",
		label: "Activité commerciale, industrielle, artisanale",
	},
	{ value: "agricole", label: "Agricole" },
	{ value: "civile", label: "Civile" },
] as const

export const TYPES_DOSSIER = [
	{ value: "compta", label: "Comptabilité" },
	{ value: "paie", label: "Paie" },
	{ value: "audit", label: "Audit" },
	{ value: "conseil", label: "Conseil" },
	{ value: "fiscal", label: "Fiscal" },
] as const

export const STATUS_LABELS: Record<string, string> = {
	actif: "Actif",
	archive: "Archivé",
	a_venir: "À venir",
	en_cours: "En cours",
	en_attente: "En attente",
	termine: "Terminé",
	ouvert: "Ouvert",
	resolu: "Résolu",
	ferme: "Fermé",
	clos: "Clos",
}
