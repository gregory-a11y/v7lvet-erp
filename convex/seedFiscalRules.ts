import { internalMutation } from "./_generated/server"

// Helper to create a rule object
function rule(
	ordre: number,
	nom: string,
	description: string,
	conditions: Array<{ champ: string; operateur: string; valeur?: unknown }>,
	branches: Array<{
		nom: string
		conditions: Array<{ champ: string; operateur: string; valeur?: unknown }>
		taches: Array<{
			nom: string
			categorie?: string
			cerfa?: string
			dateFormule: { type: string; params: Record<string, unknown> }
			repeat?: { frequence: string; moisExclus?: number[] }
		}>
	}>,
) {
	return {
		nom,
		description,
		isActive: true,
		ordre,
		conditions,
		branches,
	}
}

// All 21 fiscal rules extracted from generateFiscalTasks()
function getAllRules() {
	return [
		// ─── 1. IR Déclaration (base) ─────────────────────────────────────
		rule(
			1,
			"IR - Déclaration",
			"Déclaration IR pour catégories IR-BNC, IR-BIC, IR-RF",
			[{ champ: "categorieFiscale", operateur: "in", valeur: ["IR-BNC", "IR-BIC", "IR-RF"] }],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "Déclaration IR",
							categorie: "IR",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 2. IR-BNC / 2035 ──────────────────────────────────────────────
		rule(
			2,
			"IR-BNC - Liasse 2035",
			"Déclaration de résultat 2035 + annexes pour IR-BNC réel",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IR-BNC" },
				{
					champ: "regimeFiscal",
					operateur: "in",
					valeur: ["reel_normal", "reel_simplifie", "reel_complet"],
				},
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "Déclaration de résultat 2035 + annexes 2035 A et B",
							categorie: "IR",
							cerfa: "2035",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 3. IR-BIC Normal / 2050 ──────────────────────────────────────
		rule(
			3,
			"IR-BIC Normal - Liasse complète",
			"Liasse fiscale complète IR-BIC régime réel normal",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IR-BIC" },
				{ champ: "regimeFiscal", operateur: "equals", valeur: "reel_normal" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "IR - Déclaration de résultat : liasse fiscale complète",
							categorie: "IR",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 4. IR-BIC Simplifié ──────────────────────────────────────────
		rule(
			4,
			"IR-BIC Simplifié - Liasse simplifiée",
			"Liasse fiscale simplifiée IR-BIC régime réel simplifié",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IR-BIC" },
				{ champ: "regimeFiscal", operateur: "equals", valeur: "reel_simplifie" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "IR - Déclaration de résultat : liasse fiscale simplifiée",
							categorie: "IR",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 5. IR-RF Simplifié (2072-S) ──────────────────────────────────
		rule(
			5,
			"IR-RF Simplifié - 2072-S",
			"Liasse fiscale simplifiée IR-RF",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IR-RF" },
				{ champ: "regimeFiscal", operateur: "in", valeur: ["reel_simplifie", "micro"] },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "Déclaration de résultat : liasse fiscale simplifiée (2072-S)",
							categorie: "IR",
							cerfa: "2072-S",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 6. IR-RF Complet (2072-C) ────────────────────────────────────
		rule(
			6,
			"IR-RF Complet - 2072-C",
			"Liasse fiscale complète IR-RF",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IR-RF" },
				{ champ: "regimeFiscal", operateur: "equals", valeur: "reel_complet" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "Déclaration de résultat : liasse fiscale complète (2072-C)",
							categorie: "IR",
							cerfa: "2072-C",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 7. DSFU / PAMC ──────────────────────────────────────────────
		rule(
			7,
			"DSFU / PAMC",
			"Déclaration DSFU (+PAMC) pour professions libérales et commerciales",
			[
				{
					champ: "activite",
					operateur: "in",
					valeur: [
						"profession_liberale_medicale",
						"autres_professions_liberales",
						"commerciale_industrielle_artisanale",
					],
				},
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "Déclaration DSFU (+PAMC)",
							categorie: "IR",
							dateFormule: {
								type: "fixed",
								params: { jour: 15, mois: 5, anneeOffset: 1 },
							},
						},
					],
				},
			],
		),

		// ─── 8. IS Déclaration de résultat (simplifié) ────────────────────
		rule(
			8,
			"IS Simplifié - Liasse",
			"Liasse fiscale simplifiée IS",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IS" },
				{ champ: "regimeFiscal", operateur: "equals", valeur: "reel_simplifie" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "IS - Déclaration de résultat : liasse fiscale simplifiée",
							categorie: "IS",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 9. IS Déclaration de résultat (normal) ──────────────────────
		rule(
			9,
			"IS Normal - Liasse",
			"Liasse fiscale complète IS",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IS" },
				{ champ: "regimeFiscal", operateur: "equals", valeur: "reel_normal" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "IS - Déclaration de résultat : liasse fiscale complète",
							categorie: "IS",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 10. IS Solde + AGO + Comptes ─────────────────────────────────
		rule(
			10,
			"IS - Solde, AGO, Comptes",
			"Solde IS, AGO, dépôt comptes, comptes annuels, capitaux mobiliers",
			[{ champ: "categorieFiscale", operateur: "equals", valeur: "IS" }],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "Déclaration solde IS - Cerfa 2572",
							categorie: "IS",
							cerfa: "2572",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
								},
							},
						},
						{
							nom: "Approbation des comptes (AGO)",
							categorie: "IS",
							dateFormule: {
								type: "relative_to_ago",
								params: { moisOffset: 0, joursOffset: 0 },
							},
						},
						{
							nom: "Dépôt des comptes au greffe",
							categorie: "IS",
							dateFormule: {
								type: "relative_to_ago",
								params: { moisOffset: 2, joursOffset: 0 },
							},
						},
						{
							nom: "Etablissement des comptes annuels",
							categorie: "IS",
							dateFormule: {
								type: "relative_to_ago",
								params: { moisOffset: 2, joursOffset: 0 },
							},
						},
						{
							nom: "Entretien de présentation des comptes annuels",
							categorie: "IS",
							dateFormule: {
								type: "relative_to_ago",
								params: { moisOffset: 2, joursOffset: 0 },
							},
						},
						{
							nom: "Déclaration revenus capitaux mobiliers - Cerfa 2777",
							categorie: "IS",
							cerfa: "2777",
							dateFormule: {
								type: "relative_to_ago",
								params: { moisOffset: 0, joursOffset: 15 },
							},
						},
						{
							nom: "Déclaration revenus de capitaux mobiliers - Cerfa IFU 2561",
							categorie: "IS",
							cerfa: "2561",
							dateFormule: {
								type: "fixed",
								params: { jour: 15, mois: 2, anneeOffset: 1 },
							},
						},
					],
				},
			],
		),

		// ─── 11. IS Solde + Acomptes (trimestriels) ──────────────────────
		rule(
			11,
			"IS - Solde et Acomptes trimestriels",
			"Solde IS et 4 acomptes trimestriels (paiement non unique)",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IS" },
				{ champ: "paiementISUnique", operateur: "is_false" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "IS - Solde",
							categorie: "IS",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
									dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 15 },
								},
							},
						},
						{
							nom: "IS - Acompte_1",
							categorie: "IS",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 3, anneeOffset: 0 } },
						},
						{
							nom: "IS - Acompte_2",
							categorie: "IS",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 6, anneeOffset: 0 } },
						},
						{
							nom: "IS - Acompte_3",
							categorie: "IS",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 9, anneeOffset: 0 } },
						},
						{
							nom: "IS - Acompte_4",
							categorie: "IS",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 12, anneeOffset: 0 } },
						},
					],
				},
			],
		),

		// ─── 12. IS Solde (paiement unique) ──────────────────────────────
		rule(
			12,
			"IS - Solde paiement unique",
			"Solde IS uniquement (paiement unique, pas d'acomptes)",
			[
				{ champ: "categorieFiscale", operateur: "equals", valeur: "IS" },
				{ champ: "paiementISUnique", operateur: "is_true" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "IS - Solde",
							categorie: "IS",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { type: "relative_to_cloture", moisOffset: 4, joursOffset: 15 },
									dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 15 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 13. CVAE ────────────────────────────────────────────────────
		rule(
			13,
			"CVAE",
			"Déclarations CVAE selon CA N-1",
			[{ champ: "caN1", operateur: "gt", valeur: 152500 }],
			[
				{
					nom: "CA > 152500",
					conditions: [],
					taches: [
						{
							nom: "Déclaration de valeur ajoutée (1330) + CVAE",
							categorie: "TAXES",
							cerfa: "1330",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
						},
					],
				},
				{
					nom: "CA > 500000 - Solde",
					conditions: [{ champ: "caN1", operateur: "gt", valeur: 500000 }],
					taches: [
						{
							nom: "CVAE - Formulaire 1329 - AC - SD - Solde",
							categorie: "TAXES",
							cerfa: "1329",
							dateFormule: { type: "fixed", params: { jour: 1, mois: 5, anneeOffset: 1 } },
						},
					],
				},
				{
					nom: "CA > 500000 + CVAE N-1 > 1500 - Acomptes",
					conditions: [
						{ champ: "caN1", operateur: "gt", valeur: 500000 },
						{ champ: "montantCVAEN1", operateur: "gt", valeur: 1500 },
					],
					taches: [
						{
							nom: "CVAE - Formulaire 1329 - AC - SD - Acompte_1",
							categorie: "TAXES",
							cerfa: "1329",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 6, anneeOffset: 0 } },
						},
						{
							nom: "CVAE - Formulaire 1329 - AC - SD - Acompte_2",
							categorie: "TAXES",
							cerfa: "1329",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 9, anneeOffset: 0 } },
						},
					],
				},
			],
		),

		// ─── 14. CFE ─────────────────────────────────────────────────────
		rule(
			14,
			"CFE",
			"CFE solde, modification et acompte",
			[], // No root conditions — applies to all
			[
				{
					nom: "Base CFE",
					conditions: [],
					taches: [
						{
							nom: "CFE - Solde",
							categorie: "TAXES",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 12, anneeOffset: 0 } },
						},
						{
							nom: "CFE - Modification déclaration (1447 - M)",
							categorie: "TAXES",
							cerfa: "1447-M",
							dateFormule: { type: "fixed", params: { jour: 30, mois: 4, anneeOffset: 1 } },
						},
					],
				},
				{
					nom: "Acompte si CFE N-1 >= 3000",
					conditions: [{ champ: "montantCFEN1", operateur: "gte", valeur: 3000 }],
					taches: [
						{
							nom: "CFE - Acompte",
							categorie: "TAXES",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 6, anneeOffset: 0 } },
						},
					],
				},
			],
		),

		// ─── 15. DAS2 ────────────────────────────────────────────────────
		rule(
			15,
			"DAS2",
			"Déclaration DAS2 - Formulaire 2460",
			[], // Applies to all
			[
				{
					nom: "IS cloture 31/12",
					conditions: [{ champ: "categorieFiscale", operateur: "equals", valeur: "IS" }],
					taches: [
						{
							nom: "DAS2 - Formulaire 2460 - 2 - SD",
							categorie: "TAXES",
							cerfa: "2460",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 1, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 0 },
								},
							},
						},
					],
				},
				{
					nom: "Non-IS",
					conditions: [{ champ: "categorieFiscale", operateur: "not_equals", valeur: "IS" }],
					taches: [
						{
							nom: "DAS2 - Formulaire 2460 - 2 - SD",
							categorie: "TAXES",
							cerfa: "2460",
							dateFormule: { type: "fixed", params: { jour: 1, mois: 5, anneeOffset: 1 } },
						},
					],
				},
			],
		),

		// ─── 16. Taxe sur les salaires ───────────────────────────────────
		rule(
			16,
			"Taxe sur les salaires",
			"TS selon montant N-1 (annuelle, trimestrielle ou mensuelle)",
			[
				{ champ: "nombreEmployes", operateur: "gte", valeur: 1 },
				{ champ: "regimeTVA", operateur: "in", valeur: ["exoneree", "franchise_en_base"] },
			],
			[
				{
					nom: "TS <= 4000 (annuelle)",
					conditions: [{ champ: "montantTSN1", operateur: "lte", valeur: 4000 }],
					taches: [
						{
							nom: "TS - Formulaire 2502",
							categorie: "TAXES",
							cerfa: "2502",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 1, anneeOffset: 1 } },
						},
					],
				},
				{
					nom: "TS 4001-9999 (trimestrielle)",
					conditions: [
						{ champ: "montantTSN1", operateur: "gt", valeur: 4000 },
						{ champ: "montantTSN1", operateur: "lt", valeur: 10000 },
					],
					taches: [
						{
							nom: "TS - Formulaire 2501 - SD - 1",
							categorie: "TAXES",
							cerfa: "2501",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 4, anneeOffset: 0 } },
						},
						{
							nom: "TS - Formulaire 2501 - SD - 2",
							categorie: "TAXES",
							cerfa: "2501",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 7, anneeOffset: 0 } },
						},
						{
							nom: "TS - Formulaire 2501 - SD - 3",
							categorie: "TAXES",
							cerfa: "2501",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 10, anneeOffset: 0 } },
						},
						{
							nom: "TS - Régularisation - 2502 - SD",
							categorie: "TAXES",
							cerfa: "2502",
							dateFormule: { type: "fixed", params: { jour: 31, mois: 1, anneeOffset: 1 } },
						},
					],
				},
				{
					nom: "TS >= 10000 (mensuelle)",
					conditions: [{ champ: "montantTSN1", operateur: "gte", valeur: 10000 }],
					taches: [
						{
							nom: "TS - Formulaire 3310 - A - SD - {mois}",
							categorie: "TAXES",
							cerfa: "3310-A",
							dateFormule: {
								type: "fixed",
								params: { jour: 15, mois: 0, anneeOffset: 0 },
							},
							repeat: { frequence: "mensuelle", moisExclus: [1] },
						},
						{
							nom: "TS - Régularisation - 2502 - SD",
							categorie: "TAXES",
							cerfa: "2502",
							dateFormule: { type: "fixed", params: { jour: 31, mois: 1, anneeOffset: 1 } },
						},
					],
				},
			],
		),

		// ─── 17. Taxe foncière ───────────────────────────────────────────
		rule(
			17,
			"Taxe foncière",
			"Taxe foncière pour propriétaires",
			[{ champ: "proprietaire", operateur: "is_true" }],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "Taxe foncière",
							categorie: "TAXES",
							dateFormule: { type: "fixed", params: { jour: 30, mois: 9, anneeOffset: 0 } },
						},
					],
				},
			],
		),

		// ─── 18. TASCOM ──────────────────────────────────────────────────
		rule(
			18,
			"TASCOM",
			"Taxe sur les surfaces commerciales >= 400m²",
			[
				{ champ: "secteur", operateur: "equals", valeur: "Commerce & Distribution" },
				{ champ: "surfaceCommerciale", operateur: "gte", valeur: 400 },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "TASCOM - Formulaire 3350 - SD",
							categorie: "TAXES",
							cerfa: "3350",
							dateFormule: { type: "fixed", params: { jour: 15, mois: 6, anneeOffset: 0 } },
						},
					],
				},
			],
		),

		// ─── 19. DECLOYER ────────────────────────────────────────────────
		rule(
			19,
			"DECLOYER",
			"Déclaration des loyers pour locaux professionnels",
			[{ champ: "localPro", operateur: "is_true" }],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "DECLOYER",
							categorie: "TAXES",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 15, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 0 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 20. TSB (Taxe sur les bureaux) ──────────────────────────────
		rule(
			20,
			"TSB - Taxe sur les bureaux",
			"Taxe sur les bureaux pour départements IDF et PACA",
			[
				{
					champ: "departement",
					operateur: "in",
					valeur: ["75", "77", "78", "91", "92", "93", "94", "95", "06", "13", "83"],
				},
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "Taxe sur les bureaux - formulaire 6705 - B",
							categorie: "TAXES",
							cerfa: "6705-B",
							dateFormule: { type: "fixed", params: { jour: 1, mois: 3, anneeOffset: 0 } },
						},
					],
				},
			],
		),

		// ─── 21. TVE ─────────────────────────────────────────────────────
		rule(
			21,
			"TVE",
			"Taxe sur la valeur ajoutée des entreprises",
			[],
			[
				{
					nom: "Franchise/Exonérée/Réel normal",
					conditions: [
						{
							champ: "regimeTVA",
							operateur: "in",
							valeur: ["franchise_en_base", "exoneree", "reel_normal"],
						},
					],
					taches: [
						{
							nom: "TVE - Formulaire 3310 - A - SD",
							categorie: "TAXES",
							cerfa: "3310-A",
							dateFormule: { type: "fixed", params: { jour: 31, mois: 1, anneeOffset: 1 } },
						},
					],
				},
				{
					nom: "RSI",
					conditions: [{ champ: "regimeTVA", operateur: "equals", valeur: "rsi" }],
					taches: [
						{
							nom: "TVE - Formulaire 3517",
							categorie: "TAXES",
							cerfa: "3517",
							dateFormule: {
								type: "cloture_conditional",
								params: {
									dateA: { jour: 1, mois: 5, anneeOffset: 1 },
									dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 0 },
								},
							},
						},
					],
				},
			],
		),

		// ─── 22. TVA Réel normal mensuelle ───────────────────────────────
		rule(
			22,
			"TVA Réel normal - Mensuelle",
			"12 déclarations TVA mensuelles (CA3) régime réel normal",
			[
				{ champ: "regimeTVA", operateur: "equals", valeur: "reel_normal" },
				{ champ: "frequenceTVA", operateur: "equals", valeur: "mensuelle" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "TVA réel normal - déclaration {mois}",
							categorie: "TVA",
							dateFormule: {
								type: "end_of_month_plus_offset",
								params: { offsetJours: 0 },
							},
							repeat: { frequence: "mensuelle" },
						},
					],
				},
			],
		),

		// ─── 23. TVA Réel normal trimestrielle ───────────────────────────
		rule(
			23,
			"TVA Réel normal - Trimestrielle",
			"4 déclarations TVA trimestrielles régime réel normal",
			[
				{ champ: "regimeTVA", operateur: "equals", valeur: "reel_normal" },
				{ champ: "frequenceTVA", operateur: "equals", valeur: "trimestrielle" },
			],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "TVA réel normal - déclaration {trimestre}",
							categorie: "TVA",
							dateFormule: {
								type: "end_of_quarter_plus_offset",
								params: { offsetJours: 0 },
							},
							repeat: { frequence: "trimestrielle" },
						},
					],
				},
			],
		),

		// ─── 24. TVA RSI ─────────────────────────────────────────────────
		rule(
			24,
			"TVA RSI",
			"TVA réel simplifié : déclaration annuelle + 2 acomptes",
			[{ champ: "regimeTVA", operateur: "equals", valeur: "rsi" }],
			[
				{
					nom: "Par défaut",
					conditions: [],
					taches: [
						{
							nom: "TVA réel simplifié - déclaration annuelle",
							categorie: "TVA",
							dateFormule: {
								type: "relative_to_cloture",
								params: { moisOffset: 3, joursOffset: 0 },
							},
						},
						{
							nom: "TVA réel simplifié - Acompte_1",
							categorie: "TVA",
							dateFormule: { type: "fixed", params: { jour: 31, mois: 7, anneeOffset: 0 } },
						},
						{
							nom: "TVA réel simplifié - Acompte_2",
							categorie: "TVA",
							dateFormule: { type: "fixed", params: { jour: 31, mois: 12, anneeOffset: 0 } },
						},
					],
				},
			],
		),
	]
}

// ─── Seed mutation ───────────────────────────────────────────────────────────

export const seedAllRules = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Check if rules already exist
		const existing = await ctx.db.query("fiscalRules").first()
		if (existing) {
			return { status: "skipped", message: "Des règles existent déjà" }
		}

		const rules = getAllRules()
		const now = Date.now()

		for (const r of rules) {
			await ctx.db.insert("fiscalRules", {
				...r,
				createdAt: now,
				updatedAt: now,
			} as any)
		}

		return { status: "seeded", count: rules.length }
	},
})

// Seed can be triggered via Convex dashboard: run internal mutation seedFiscalRules.seedAllRules
