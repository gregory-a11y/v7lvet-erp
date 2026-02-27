import { internalMutation } from "./_generated/server"

// ─── Node/Edge builders ─────────────────────────────────────────────────────

interface NodeDef {
	id: string
	type: string
	x: number
	y: number
	data: Record<string, unknown>
}

interface EdgeDef {
	source: string
	target: string
	sourceHandle?: string
	label?: string
	animated?: boolean
	style?: Record<string, unknown>
}

function startNode(id: string, x: number, y: number, label: string): NodeDef {
	return { id, type: "startNode", x, y, data: { label } }
}

function groupNode(id: string, x: number, y: number, label: string, groupe: string): NodeDef {
	return { id, type: "groupNode", x, y, data: { label, groupe } }
}

function conditionNode(
	id: string,
	x: number,
	y: number,
	champ: string,
	operateur: string,
	valeur?: unknown,
	label?: string,
): NodeDef {
	return { id, type: "conditionNode", x, y, data: { champ, operateur, valeur, label } }
}

function taskNode(
	id: string,
	x: number,
	y: number,
	nom: string,
	categorie: string,
	opts: {
		cerfa?: string
		dateFormule?: { type: string; params: Record<string, unknown> }
		repeat?: { frequence: string; moisExclus?: number[] }
	} = {},
): NodeDef {
	return {
		id,
		type: "taskNode",
		x,
		y,
		data: {
			nom,
			categorie,
			cerfa: opts.cerfa,
			dateFormule: opts.dateFormule,
			hasRepeat: !!opts.repeat,
			repeat: opts.repeat,
		},
	}
}

function nothingNode(id: string, x: number, y: number): NodeDef {
	return { id, type: "nothingNode", x, y, data: {} }
}

function ouiEdge(source: string, target: string): EdgeDef {
	return {
		source,
		target,
		sourceHandle: "oui",
		label: "OUI",
		animated: true,
		style: { stroke: "#10b981", strokeWidth: 2 },
	}
}

function nonEdge(source: string, target: string): EdgeDef {
	return {
		source,
		target,
		sourceHandle: "non",
		label: "NON",
		animated: true,
		style: { stroke: "#ef4444", strokeWidth: 2 },
	}
}

function flowEdge(source: string, target: string): EdgeDef {
	return { source, target, style: { stroke: "#063238", strokeWidth: 1.5 } }
}

// ─── Build the full decision tree ───────────────────────────────────────────

export function buildMindmap() {
	const nodes: NodeDef[] = []
	const edges: EdgeDef[] = []

	// ═══════════════════════════════════════════════════════════════════════
	// ROOT
	// ═══════════════════════════════════════════════════════════════════════
	const root = "start"
	nodes.push(startNode(root, 1200, 0, "Système Fiscal"))

	// ═══════════════════════════════════════════════════════════════════════
	// GROUPS
	// ═══════════════════════════════════════════════════════════════════════
	const gIR = "g_ir"
	const gIS = "g_is"
	const gTVA = "g_tva"
	const gCFE = "g_cfe"
	const gCVAE = "g_cvae"
	const gTAXES = "g_taxes"

	nodes.push(groupNode(gIR, 200, 150, "IR — Impôt sur le Revenu", "IR"))
	nodes.push(groupNode(gIS, 700, 150, "IS — Impôt sur les Sociétés", "IS"))
	nodes.push(groupNode(gTVA, 1200, 150, "TVA", "TVA"))
	nodes.push(groupNode(gCFE, 1600, 150, "CFE", "CFE"))
	nodes.push(groupNode(gCVAE, 1900, 150, "CVAE", "CVAE"))
	nodes.push(groupNode(gTAXES, 2300, 150, "Taxes & Déclarations", "TAXES"))

	edges.push(flowEdge(root, gIR))
	edges.push(flowEdge(root, gIS))
	edges.push(flowEdge(root, gTVA))
	edges.push(flowEdge(root, gCFE))
	edges.push(flowEdge(root, gCVAE))
	edges.push(flowEdge(root, gTAXES))

	// ═══════════════════════════════════════════════════════════════════════
	// IR BRANCH
	// ═══════════════════════════════════════════════════════════════════════
	const cIR = "c_is_ir"
	nodes.push(
		conditionNode(
			cIR,
			200,
			300,
			"categorieFiscale",
			"in",
			["IR-BNC", "IR-BIC", "IR-RF"],
			"Catégorie fiscale ∈ [IR-BNC, IR-BIC, IR-RF]",
		),
	)
	edges.push(flowEdge(gIR, cIR))

	// OUI → Déclaration IR
	const tIRDecl = "t_ir_decl"
	nodes.push(
		taskNode(tIRDecl, 50, 450, "Déclaration IR (2042 + 2042-C-PRO)", "IR", {
			cerfa: "2042",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cIR, tIRDecl))

	// NON → rien pour IR
	const nIR = "n_ir_nothing"
	nodes.push(nothingNode(nIR, 350, 450))
	edges.push(nonEdge(cIR, nIR))

	// Sub-conditions: IR-BNC
	const cIRBNC = "c_ir_bnc"
	nodes.push(conditionNode(cIRBNC, -100, 600, "categorieFiscale", "equals", "IR-BNC", "IR-BNC ?"))
	edges.push(flowEdge(tIRDecl, cIRBNC))

	// BNC → Réel check (Micro → pas de 2035)
	const cIRBNCRegime = "c_ir_bnc_regime"
	nodes.push(
		conditionNode(
			cIRBNCRegime,
			-200,
			700,
			"regimeFiscal",
			"not_equals",
			"micro",
			"Régime ≠ Micro ?",
		),
	)
	edges.push(ouiEdge(cIRBNC, cIRBNCRegime))

	const tLiasse2035 = "t_liasse_2035"
	nodes.push(
		taskNode(tLiasse2035, -350, 850, "Liasse 2035 + annexes 2035 A et B", "IR", {
			cerfa: "2035",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cIRBNCRegime, tLiasse2035))

	const nIRBNCMicro = "n_ir_bnc_micro"
	nodes.push(nothingNode(nIRBNCMicro, -50, 850))
	edges.push(nonEdge(cIRBNCRegime, nIRBNCMicro))

	// IR-BIC check
	const cIRBIC = "c_ir_bic"
	nodes.push(conditionNode(cIRBIC, 100, 750, "categorieFiscale", "equals", "IR-BIC", "IR-BIC ?"))
	edges.push(nonEdge(cIRBNC, cIRBIC))

	// IR-BIC → Micro exclusion (micro BIC → pas de liasse)
	const cIRBICNotMicro = "c_ir_bic_not_micro"
	nodes.push(
		conditionNode(
			cIRBICNotMicro,
			0,
			850,
			"regimeFiscal",
			"not_equals",
			"micro",
			"Régime ≠ Micro ?",
		),
	)
	edges.push(ouiEdge(cIRBIC, cIRBICNotMicro))

	const nIRBICMicro = "n_ir_bic_micro"
	nodes.push(nothingNode(nIRBICMicro, 200, 850))
	edges.push(nonEdge(cIRBICNotMicro, nIRBICMicro))

	// IR-BIC normal
	const cIRBICNormal = "c_ir_bic_normal"
	nodes.push(
		conditionNode(
			cIRBICNormal,
			-50,
			950,
			"regimeFiscal",
			"equals",
			"reel_normal",
			"Régime normal ?",
		),
	)
	edges.push(ouiEdge(cIRBICNotMicro, cIRBICNormal))

	const tIRBICNormal = "t_ir_bic_normal"
	nodes.push(
		taskNode(tIRBICNormal, -200, 1050, "IR-BIC Liasse complète (2050-2059)", "IR", {
			cerfa: "2050",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cIRBICNormal, tIRBICNormal))

	// IR-BIC simplifié
	const tIRBICSimp = "t_ir_bic_simp"
	nodes.push(
		taskNode(tIRBICSimp, 100, 1050, "IR-BIC Liasse simplifiée (2031)", "IR", {
			cerfa: "2031",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(nonEdge(cIRBICNormal, tIRBICSimp))

	// IR-RF check
	const cIRRF = "c_ir_rf"
	nodes.push(conditionNode(cIRRF, 300, 900, "categorieFiscale", "equals", "IR-RF", "IR-RF ?"))
	edges.push(nonEdge(cIRBIC, cIRRF))

	// IR-RF → Micro exclusion (micro RF → pas de liasse)
	const cIRRFNotMicro = "c_ir_rf_not_micro"
	nodes.push(
		conditionNode(
			cIRRFNotMicro,
			350,
			1000,
			"regimeFiscal",
			"not_equals",
			"micro",
			"Régime ≠ Micro ?",
		),
	)
	edges.push(ouiEdge(cIRRF, cIRRFNotMicro))

	const nIRRFMicro = "n_ir_rf_micro"
	nodes.push(nothingNode(nIRRFMicro, 550, 1000))
	edges.push(nonEdge(cIRRFNotMicro, nIRRFMicro))

	const cIRRFComplet = "c_ir_rf_complet"
	nodes.push(
		conditionNode(
			cIRRFComplet,
			300,
			1100,
			"regimeFiscal",
			"equals",
			"reel_complet",
			"Régime complet ?",
		),
	)
	edges.push(ouiEdge(cIRRFNotMicro, cIRRFComplet))

	const tIRRFComplet = "t_ir_rf_complet"
	nodes.push(
		taskNode(tIRRFComplet, 200, 1200, "Liasse 2072-C complète", "IR", {
			cerfa: "2072-C",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cIRRFComplet, tIRRFComplet))

	const tIRRFSimp = "t_ir_rf_simp"
	nodes.push(
		taskNode(tIRRFSimp, 450, 1200, "Liasse 2072-S simplifiée", "IR", {
			cerfa: "2072-S",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(nonEdge(cIRRFComplet, tIRRFSimp))

	// DSFU/PAMC — uniquement pour TNS (exclure SAS/SASU/SA = dirigeant assimilé salarié)
	const cDSFUForme = "c_dsfu_forme"
	nodes.push(
		conditionNode(
			cDSFUForme,
			2200,
			400,
			"formeJuridique",
			"not_in",
			["SAS", "SASU", "SA"],
			"Forme juridique TNS ?",
		),
	)
	edges.push(flowEdge(gTAXES, cDSFUForme))

	const nDSFUForme = "n_dsfu_forme"
	nodes.push(nothingNode(nDSFUForme, 2350, 400))
	edges.push(nonEdge(cDSFUForme, nDSFUForme))

	const cDSFU = "c_dsfu"
	nodes.push(
		conditionNode(
			cDSFU,
			2200,
			550,
			"activite",
			"in",
			[
				"profession_liberale_medicale",
				"autres_professions_liberales",
				"commerciale_industrielle_artisanale",
			],
			"Activité libérale/commerciale ?",
		),
	)
	edges.push(ouiEdge(cDSFUForme, cDSFU))

	const tDSFU = "t_dsfu"
	nodes.push(
		taskNode(tDSFU, 2100, 650, "Déclaration DSFU (+PAMC)", "TAXES", {
			dateFormule: { type: "fixed", params: { jour: 15, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cDSFU, tDSFU))

	const nDSFU = "n_dsfu"
	nodes.push(nothingNode(nDSFU, 2300, 650))
	edges.push(nonEdge(cDSFU, nDSFU))

	// ═══════════════════════════════════════════════════════════════════════
	// IS BRANCH
	// ═══════════════════════════════════════════════════════════════════════
	const cIS = "c_is_is"
	nodes.push(conditionNode(cIS, 700, 300, "categorieFiscale", "equals", "IS", "Catégorie = IS ?"))
	edges.push(flowEdge(gIS, cIS))

	const nIS = "n_is_nothing"
	nodes.push(nothingNode(nIS, 850, 450))
	edges.push(nonEdge(cIS, nIS))

	// IS Liasse
	const cISRegime = "c_is_regime"
	nodes.push(
		conditionNode(
			cISRegime,
			600,
			450,
			"regimeFiscal",
			"equals",
			"reel_simplifie",
			"Régime simplifié ?",
		),
	)
	edges.push(ouiEdge(cIS, cISRegime))

	const tISSimp = "t_is_simp"
	nodes.push(
		taskNode(tISSimp, 450, 600, "IS - Liasse fiscale simplifiée", "IS", {
			cerfa: "2065",
			dateFormule: {
				type: "cloture_conditional",
				params: {
					dateA: { jour: 15, mois: 5, anneeOffset: 1 },
					dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 15 },
				},
			},
		}),
	)
	edges.push(ouiEdge(cISRegime, tISSimp))

	const tISNormal = "t_is_normal"
	nodes.push(
		taskNode(tISNormal, 750, 600, "IS - Liasse fiscale complète", "IS", {
			cerfa: "2065",
			dateFormule: {
				type: "cloture_conditional",
				params: {
					dateA: { jour: 15, mois: 5, anneeOffset: 1 },
					dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 15 },
				},
			},
		}),
	)
	edges.push(nonEdge(cISRegime, tISNormal))

	// IS Solde + AGO + Comptes (toujours pour IS)
	const tISSolde = "t_is_solde"
	nodes.push(
		taskNode(tISSolde, 500, 750, "Déclaration solde IS (Cerfa 2572)", "IS", {
			cerfa: "2572",
			dateFormule: {
				type: "cloture_conditional",
				params: {
					dateA: { jour: 15, mois: 5, anneeOffset: 1 },
					dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 15 },
				},
			},
		}),
	)
	edges.push(flowEdge(tISSimp, tISSolde))
	edges.push(flowEdge(tISNormal, tISSolde))

	// IS - Solde (paiement) — toujours créé pour IS, distinct de la déclaration 2572
	const tISSoldePaiement = "t_is_solde_paiement"
	nodes.push(
		taskNode(tISSoldePaiement, 700, 750, "IS - Solde (paiement)", "IS", {
			dateFormule: {
				type: "cloture_conditional",
				params: {
					dateA: { jour: 15, mois: 5, anneeOffset: 1 },
					dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 15 },
				},
			},
		}),
	)
	edges.push(flowEdge(tISSimp, tISSoldePaiement))
	edges.push(flowEdge(tISNormal, tISSoldePaiement))

	const tAGO = "t_is_ago"
	nodes.push(
		taskNode(tAGO, 500, 870, "Approbation des comptes (AGO)", "IS", {
			dateFormule: { type: "relative_to_ago", params: { moisOffset: 0, joursOffset: 0 } },
		}),
	)
	edges.push(flowEdge(tISSolde, tAGO))

	const tDepotGreffe = "t_is_depot"
	nodes.push(
		taskNode(tDepotGreffe, 500, 960, "Dépôt des comptes au greffe", "IS", {
			dateFormule: { type: "relative_to_ago", params: { moisOffset: 2, joursOffset: 0 } },
		}),
	)
	edges.push(flowEdge(tAGO, tDepotGreffe))

	const tComptes = "t_is_comptes"
	nodes.push(
		taskNode(tComptes, 500, 1050, "Établissement comptes annuels", "IS", {
			dateFormule: { type: "relative_to_ago", params: { moisOffset: 2, joursOffset: 0 } },
		}),
	)
	edges.push(flowEdge(tDepotGreffe, tComptes))

	const tEntretien = "t_is_entretien"
	nodes.push(
		taskNode(tEntretien, 700, 1050, "Entretien présentation comptes annuels", "IS", {
			dateFormule: { type: "relative_to_ago", params: { moisOffset: 2, joursOffset: 0 } },
		}),
	)
	edges.push(flowEdge(tComptes, tEntretien))

	const tCapMob = "t_is_capmob"
	nodes.push(
		taskNode(tCapMob, 500, 1140, "Revenus capitaux mobiliers (2777)", "IS", {
			cerfa: "2777",
			dateFormule: { type: "relative_to_ago", params: { moisOffset: 0, joursOffset: 15 } },
		}),
	)
	edges.push(flowEdge(tEntretien, tCapMob))

	const tIFU = "t_is_ifu"
	nodes.push(
		taskNode(tIFU, 500, 1230, "IFU (2561)", "IS", {
			cerfa: "2561",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 2, anneeOffset: 1 } },
		}),
	)
	edges.push(flowEdge(tCapMob, tIFU))

	// IS Acomptes
	const cISPaiement = "c_is_paiement"
	nodes.push(
		conditionNode(
			cISPaiement,
			800,
			750,
			"paiementISUnique",
			"is_true",
			undefined,
			"Paiement unique ?",
		),
	)
	edges.push(flowEdge(tISSoldePaiement, cISPaiement))

	// Paiement unique → pas d'acomptes (le solde est toujours créé en amont)
	const nISPaiementUnique = "n_is_paiement_unique"
	nodes.push(nothingNode(nISPaiementUnique, 950, 900))
	edges.push(ouiEdge(cISPaiement, nISPaiementUnique))

	// Acomptes — dates calculées selon la période de clôture
	const tISAc1 = "t_is_ac1"
	nodes.push(
		taskNode(tISAc1, 700, 900, "IS - Acompte 1", "IS", {
			dateFormule: { type: "is_acompte_cloture_period", params: { acompteNum: 1 } },
		}),
	)
	edges.push(nonEdge(cISPaiement, tISAc1))

	const tISAc2 = "t_is_ac2"
	nodes.push(
		taskNode(tISAc2, 700, 990, "IS - Acompte 2", "IS", {
			dateFormule: { type: "is_acompte_cloture_period", params: { acompteNum: 2 } },
		}),
	)
	edges.push(flowEdge(tISAc1, tISAc2))

	const tISAc3 = "t_is_ac3"
	nodes.push(
		taskNode(tISAc3, 700, 1080, "IS - Acompte 3", "IS", {
			dateFormule: { type: "is_acompte_cloture_period", params: { acompteNum: 3 } },
		}),
	)
	edges.push(flowEdge(tISAc2, tISAc3))

	const tISAc4 = "t_is_ac4"
	nodes.push(
		taskNode(tISAc4, 700, 1170, "IS - Acompte 4", "IS", {
			dateFormule: { type: "is_acompte_cloture_period", params: { acompteNum: 4 } },
		}),
	)
	edges.push(flowEdge(tISAc3, tISAc4))

	// ═══════════════════════════════════════════════════════════════════════
	// TVA BRANCH
	// ═══════════════════════════════════════════════════════════════════════
	const cTVAReelNormal = "c_tva_rn"
	nodes.push(
		conditionNode(
			cTVAReelNormal,
			1200,
			300,
			"regimeTVA",
			"equals",
			"reel_normal",
			"Régime TVA = Réel normal ?",
		),
	)
	edges.push(flowEdge(gTVA, cTVAReelNormal))

	// Réel normal → mensuelle ou trimestrielle
	const cTVAFreq = "c_tva_freq"
	nodes.push(
		conditionNode(
			cTVAFreq,
			1100,
			450,
			"frequenceTVA",
			"equals",
			"mensuelle",
			"Fréquence = mensuelle ?",
		),
	)
	edges.push(ouiEdge(cTVAReelNormal, cTVAFreq))

	const tTVAMens = "t_tva_mens"
	nodes.push(
		taskNode(tTVAMens, 950, 600, "TVA CA3 - {mois}", "TVA", {
			dateFormule: { type: "end_of_month_plus_offset", params: {} },
			repeat: { frequence: "mensuelle" },
		}),
	)
	edges.push(ouiEdge(cTVAFreq, tTVAMens))

	const tTVATrim = "t_tva_trim"
	nodes.push(
		taskNode(tTVATrim, 1200, 600, "TVA CA3 - {trimestre}", "TVA", {
			dateFormule: { type: "end_of_quarter_plus_offset", params: {} },
			repeat: { frequence: "trimestrielle" },
		}),
	)
	edges.push(nonEdge(cTVAFreq, tTVATrim))

	// RSI
	const cTVARSI = "c_tva_rsi"
	nodes.push(conditionNode(cTVARSI, 1350, 450, "regimeTVA", "equals", "rsi", "Régime TVA = RSI ?"))
	edges.push(nonEdge(cTVAReelNormal, cTVARSI))

	const tTVARSIAnnuelle = "t_tva_rsi_ann"
	nodes.push(
		taskNode(tTVARSIAnnuelle, 1300, 600, "TVA RSI - déclaration annuelle (CA12)", "TVA", {
			cerfa: "CA12",
			dateFormule: {
				type: "cloture_conditional",
				params: {
					dateA: { jour: 5, mois: 5, anneeOffset: 1 },
					dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 0 },
				},
			},
		}),
	)
	edges.push(ouiEdge(cTVARSI, tTVARSIAnnuelle))

	const tTVARSIAc1 = "t_tva_rsi_ac1"
	nodes.push(
		taskNode(tTVARSIAc1, 1300, 720, "TVA RSI - Acompte 1 (31/07)", "TVA", {
			dateFormule: { type: "fixed", params: { jour: 31, mois: 7, anneeOffset: 0 } },
		}),
	)
	edges.push(flowEdge(tTVARSIAnnuelle, tTVARSIAc1))

	const tTVARSIAc2 = "t_tva_rsi_ac2"
	nodes.push(
		taskNode(tTVARSIAc2, 1300, 810, "TVA RSI - Acompte 2 (31/12)", "TVA", {
			dateFormule: { type: "fixed", params: { jour: 31, mois: 12, anneeOffset: 0 } },
		}),
	)
	edges.push(flowEdge(tTVARSIAc1, tTVARSIAc2))

	// Franchise/exonérée → rien pour TVA
	const nTVA = "n_tva_nothing"
	nodes.push(nothingNode(nTVA, 1500, 600))
	edges.push(nonEdge(cTVARSI, nTVA))

	// ═══════════════════════════════════════════════════════════════════════
	// CFE BRANCH
	// ═══════════════════════════════════════════════════════════════════════
	const tCFESolde = "t_cfe_solde"
	nodes.push(
		taskNode(tCFESolde, 1600, 300, "CFE - Solde (15/12)", "CFE", {
			dateFormule: { type: "fixed", params: { jour: 15, mois: 12, anneeOffset: 0 } },
		}),
	)
	edges.push(flowEdge(gCFE, tCFESolde))

	const tCFEModif = "t_cfe_modif"
	nodes.push(
		taskNode(tCFEModif, 1600, 420, "CFE - Modification (1447-M)", "CFE", {
			cerfa: "1447-M",
			dateFormule: { type: "fixed", params: { jour: 30, mois: 4, anneeOffset: 1 } },
		}),
	)
	edges.push(flowEdge(tCFESolde, tCFEModif))

	const cCFEAcompte = "c_cfe_acompte"
	nodes.push(conditionNode(cCFEAcompte, 1600, 540, "montantCFEN1", "gte", 3000, "CFE N-1 ≥ 3000 ?"))
	edges.push(flowEdge(tCFEModif, cCFEAcompte))

	const tCFEAcompte = "t_cfe_acompte"
	nodes.push(
		taskNode(tCFEAcompte, 1500, 680, "CFE - Acompte (15/06)", "CFE", {
			dateFormule: { type: "fixed", params: { jour: 15, mois: 6, anneeOffset: 0 } },
		}),
	)
	edges.push(ouiEdge(cCFEAcompte, tCFEAcompte))

	const nCFE = "n_cfe_nothing"
	nodes.push(nothingNode(nCFE, 1700, 680))
	edges.push(nonEdge(cCFEAcompte, nCFE))

	// ═══════════════════════════════════════════════════════════════════════
	// CVAE BRANCH
	// ═══════════════════════════════════════════════════════════════════════
	const cCVAE = "c_cvae_ca"
	nodes.push(conditionNode(cCVAE, 1900, 300, "caN1", "gt", 152500, "CA N-1 > 152 500 ?"))
	edges.push(flowEdge(gCVAE, cCVAE))

	const tCVAEDecl = "t_cvae_decl"
	nodes.push(
		taskNode(tCVAEDecl, 1800, 450, "CVAE - 1330 + Déclaration (03/05)", "CVAE", {
			cerfa: "1330",
			dateFormule: { type: "fixed", params: { jour: 3, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cCVAE, tCVAEDecl))

	const nCVAE = "n_cvae_nothing"
	nodes.push(nothingNode(nCVAE, 2050, 450))
	edges.push(nonEdge(cCVAE, nCVAE))

	// CVAE > 500k → solde
	const cCVAE500k = "c_cvae_500k"
	nodes.push(conditionNode(cCVAE500k, 1800, 580, "caN1", "gt", 500000, "CA N-1 > 500 000 ?"))
	edges.push(flowEdge(tCVAEDecl, cCVAE500k))

	const tCVAESolde = "t_cvae_solde"
	nodes.push(
		taskNode(tCVAESolde, 1700, 720, "CVAE - 1329 Solde", "CVAE", {
			cerfa: "1329",
			dateFormule: { type: "fixed", params: { jour: 1, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cCVAE500k, tCVAESolde))

	// CVAE acomptes si CVAE N-1 > 1500
	const cCVAEAc = "c_cvae_ac"
	nodes.push(conditionNode(cCVAEAc, 1700, 850, "montantCVAEN1", "gt", 1500, "CVAE N-1 > 1 500 ?"))
	edges.push(flowEdge(tCVAESolde, cCVAEAc))

	const tCVAEAc1 = "t_cvae_ac1"
	nodes.push(
		taskNode(tCVAEAc1, 1600, 980, "CVAE - Acompte 1 (15/06)", "CVAE", {
			cerfa: "1329",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 6, anneeOffset: 0 } },
		}),
	)
	edges.push(ouiEdge(cCVAEAc, tCVAEAc1))

	const tCVAEAc2 = "t_cvae_ac2"
	nodes.push(
		taskNode(tCVAEAc2, 1600, 1070, "CVAE - Acompte 2 (15/09)", "CVAE", {
			cerfa: "1329",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 9, anneeOffset: 0 } },
		}),
	)
	edges.push(flowEdge(tCVAEAc1, tCVAEAc2))

	const nCVAEAc = "n_cvae_ac_nothing"
	nodes.push(nothingNode(nCVAEAc, 1850, 980))
	edges.push(nonEdge(cCVAEAc, nCVAEAc))

	// ═══════════════════════════════════════════════════════════════════════
	// TAXES BRANCH
	// ═══════════════════════════════════════════════════════════════════════

	// DAS2 — date dépend de IS vs IR
	const cDAS2Cat = "c_das2_cat"
	nodes.push(
		conditionNode(cDAS2Cat, 2200, 300, "categorieFiscale", "equals", "IS", "Catégorie = IS ?"),
	)
	edges.push(flowEdge(gTAXES, cDAS2Cat))

	const tDAS2IS = "t_das2_is"
	nodes.push(
		taskNode(tDAS2IS, 2100, 450, "DAS2 - Formulaire 2460", "TAXES", {
			cerfa: "2460",
			dateFormule: {
				type: "cloture_conditional",
				params: {
					dateA: { jour: 1, mois: 5, anneeOffset: 1 },
					dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 0 },
				},
			},
		}),
	)
	edges.push(ouiEdge(cDAS2Cat, tDAS2IS))

	const tDAS2IR = "t_das2_ir"
	nodes.push(
		taskNode(tDAS2IR, 2300, 450, "DAS2 - Formulaire 2460", "TAXES", {
			cerfa: "2460",
			dateFormule: { type: "fixed", params: { jour: 1, mois: 5, anneeOffset: 1 } },
		}),
	)
	edges.push(nonEdge(cDAS2Cat, tDAS2IR))

	// Taxe sur les salaires
	const cTS = "c_ts"
	nodes.push(conditionNode(cTS, 2500, 300, "nombreEmployes", "gte", 1, "Employés ≥ 1 ?"))
	edges.push(flowEdge(gTAXES, cTS))

	const cTSExo = "c_ts_exo"
	nodes.push(
		conditionNode(
			cTSExo,
			2500,
			450,
			"regimeTVA",
			"in",
			["exoneree", "franchise_en_base"],
			"TVA exonérée/franchise ?",
		),
	)
	edges.push(ouiEdge(cTS, cTSExo))

	const nTS = "n_ts_nothing"
	nodes.push(nothingNode(nTS, 2700, 450))
	edges.push(nonEdge(cTS, nTS))

	// TS montant
	const cTSMontant1 = "c_ts_montant1"
	nodes.push(conditionNode(cTSMontant1, 2400, 600, "montantTSN1", "lte", 4000, "TS N-1 ≤ 4 000 ?"))
	edges.push(ouiEdge(cTSExo, cTSMontant1))

	const nTSExo = "n_ts_exo"
	nodes.push(nothingNode(nTSExo, 2650, 600))
	edges.push(nonEdge(cTSExo, nTSExo))

	const tTSAnnuelle = "t_ts_annuelle"
	nodes.push(
		taskNode(tTSAnnuelle, 2250, 750, "TS - 2502 (annuelle)", "TAXES", {
			cerfa: "2502",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 1, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cTSMontant1, tTSAnnuelle))

	const cTSMontant2 = "c_ts_montant2"
	nodes.push(conditionNode(cTSMontant2, 2500, 750, "montantTSN1", "lt", 10000, "TS N-1 < 10 000 ?"))
	edges.push(nonEdge(cTSMontant1, cTSMontant2))

	const tTSTrim1 = "t_ts_trim1"
	nodes.push(
		taskNode(tTSTrim1, 2400, 900, "TS - 2501 Q1 (15/04)", "TAXES", {
			cerfa: "2501",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 4, anneeOffset: 0 } },
		}),
	)
	const tTSTrim2 = "t_ts_trim2"
	nodes.push(
		taskNode(tTSTrim2, 2400, 980, "TS - 2501 Q2 (15/07)", "TAXES", {
			cerfa: "2501",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 7, anneeOffset: 0 } },
		}),
	)
	const tTSTrim3 = "t_ts_trim3"
	nodes.push(
		taskNode(tTSTrim3, 2400, 1060, "TS - 2501 Q3 (15/10)", "TAXES", {
			cerfa: "2501",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 10, anneeOffset: 0 } },
		}),
	)
	const tTSRegul = "t_ts_regul"
	nodes.push(
		taskNode(tTSRegul, 2400, 1140, "TS - Régul. 2502 (31/01)", "TAXES", {
			cerfa: "2502",
			dateFormule: { type: "fixed", params: { jour: 31, mois: 1, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cTSMontant2, tTSTrim1))
	edges.push(flowEdge(tTSTrim1, tTSTrim2))
	edges.push(flowEdge(tTSTrim2, tTSTrim3))
	edges.push(flowEdge(tTSTrim3, tTSRegul))

	// TS mensuelle (>= 10000)
	const tTSMens = "t_ts_mens"
	nodes.push(
		taskNode(tTSMens, 2650, 900, "TS - 3310-A mensuelle {mois}", "TAXES", {
			cerfa: "3310-A",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 0, moisOffset: 1, anneeOffset: 0 } },
			repeat: { frequence: "mensuelle", moisExclus: [12] },
		}),
	)
	edges.push(nonEdge(cTSMontant2, tTSMens))

	const tTSMensRegul = "t_ts_mens_regul"
	nodes.push(
		taskNode(tTSMensRegul, 2650, 1000, "TS - Régul. 2502 (31/01)", "TAXES", {
			cerfa: "2502",
			dateFormule: { type: "fixed", params: { jour: 31, mois: 1, anneeOffset: 1 } },
		}),
	)
	edges.push(flowEdge(tTSMens, tTSMensRegul))

	// Taxe foncière
	const cTF = "c_tf"
	nodes.push(conditionNode(cTF, 2800, 300, "proprietaire", "is_true", undefined, "Propriétaire ?"))
	edges.push(flowEdge(gTAXES, cTF))

	const tTF = "t_tf"
	nodes.push(
		taskNode(tTF, 2750, 450, "Taxe foncière (30/09)", "TAXES", {
			dateFormule: { type: "fixed", params: { jour: 30, mois: 9, anneeOffset: 0 } },
		}),
	)
	edges.push(ouiEdge(cTF, tTF))

	const nTF = "n_tf"
	nodes.push(nothingNode(nTF, 2950, 450))
	edges.push(nonEdge(cTF, nTF))

	// TASCOM (secteur Commerce & Distribution + surface ≥ 400m²)
	const cTASCOMSecteur = "c_tascom_secteur"
	nodes.push(
		conditionNode(
			cTASCOMSecteur,
			3100,
			300,
			"secteur",
			"equals",
			"Commerce & Distribution",
			"Secteur Commerce ?",
		),
	)
	edges.push(flowEdge(gTAXES, cTASCOMSecteur))

	const cTASCOM = "c_tascom"
	nodes.push(
		conditionNode(cTASCOM, 3050, 450, "surfaceCommerciale", "gte", 400, "Surface ≥ 400m² ?"),
	)
	edges.push(ouiEdge(cTASCOMSecteur, cTASCOM))

	const nTASCOMSecteur = "n_tascom_secteur"
	nodes.push(nothingNode(nTASCOMSecteur, 3250, 450))
	edges.push(nonEdge(cTASCOMSecteur, nTASCOMSecteur))

	// TASCOM nécessite aussi CA ≥ 460 000 €
	const cTASCOMCA = "c_tascom_ca"
	nodes.push(conditionNode(cTASCOMCA, 3050, 550, "caN1", "gte", 460000, "CA N-1 ≥ 460 000 € ?"))
	edges.push(ouiEdge(cTASCOM, cTASCOMCA))

	const nTASCOM = "n_tascom"
	nodes.push(nothingNode(nTASCOM, 3150, 550))
	edges.push(nonEdge(cTASCOM, nTASCOM))

	const tTASCOM = "t_tascom"
	nodes.push(
		taskNode(tTASCOM, 2950, 700, "TASCOM - 3350 (15/06)", "TAXES", {
			cerfa: "3350",
			dateFormule: { type: "fixed", params: { jour: 15, mois: 6, anneeOffset: 0 } },
		}),
	)
	edges.push(ouiEdge(cTASCOMCA, tTASCOM))

	const nTASCOMCA = "n_tascom_ca"
	nodes.push(nothingNode(nTASCOMCA, 3150, 700))
	edges.push(nonEdge(cTASCOMCA, nTASCOMCA))

	// DECLOYER
	const cDECLOYER = "c_decloyer"
	nodes.push(
		conditionNode(cDECLOYER, 3400, 300, "localPro", "is_true", undefined, "Local professionnel ?"),
	)
	edges.push(flowEdge(gTAXES, cDECLOYER))

	const tDECLOYER = "t_decloyer"
	nodes.push(
		taskNode(tDECLOYER, 3300, 450, "DECLOYER", "TAXES", {
			dateFormule: {
				type: "cloture_conditional",
				params: {
					dateA: { jour: 15, mois: 5, anneeOffset: 1 },
					dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 0 },
				},
			},
		}),
	)
	edges.push(ouiEdge(cDECLOYER, tDECLOYER))

	const nDECLOYER = "n_decloyer"
	nodes.push(nothingNode(nDECLOYER, 3500, 450))
	edges.push(nonEdge(cDECLOYER, nDECLOYER))

	// TSB
	const cTSB = "c_tsb"
	nodes.push(
		conditionNode(
			cTSB,
			3650,
			300,
			"departement",
			"in",
			["75", "77", "78", "91", "92", "93", "94", "95", "06", "13", "83"],
			"Département IDF/PACA ?",
		),
	)
	edges.push(flowEdge(gTAXES, cTSB))

	const tTSB = "t_tsb"
	nodes.push(
		taskNode(tTSB, 3550, 450, "TSB - 6705-B (01/03)", "TAXES", {
			cerfa: "6705-B",
			dateFormule: { type: "fixed", params: { jour: 1, mois: 3, anneeOffset: 0 } },
		}),
	)
	edges.push(ouiEdge(cTSB, tTSB))

	const nTSB = "n_tsb"
	nodes.push(nothingNode(nTSB, 3800, 450))
	edges.push(nonEdge(cTSB, nTSB))

	// TVE — vérifie d'abord si le client a des véhicules soumis à TVE
	const cTVEActive = "c_tve_active"
	nodes.push(conditionNode(cTVEActive, 3900, 250, "tve", "is_true", undefined, "TVE applicable ?"))
	edges.push(flowEdge(gTAXES, cTVEActive))

	const nTVEActive = "n_tve_active"
	nodes.push(nothingNode(nTVEActive, 4050, 250))
	edges.push(nonEdge(cTVEActive, nTVEActive))

	const cTVE = "c_tve"
	nodes.push(
		conditionNode(
			cTVE,
			3900,
			400,
			"regimeTVA",
			"in",
			["franchise_en_base", "exoneree", "reel_normal"],
			"TVA franchise/exo/normal ?",
		),
	)
	edges.push(ouiEdge(cTVEActive, cTVE))

	const tTVE1 = "t_tve_3310"
	nodes.push(
		taskNode(tTVE1, 3800, 450, "TVE - 3310-A (25/01)", "TAXES", {
			cerfa: "3310-A",
			dateFormule: { type: "fixed", params: { jour: 25, mois: 1, anneeOffset: 1 } },
		}),
	)
	edges.push(ouiEdge(cTVE, tTVE1))

	// TVE RSI
	const cTVERSI = "c_tve_rsi"
	nodes.push(conditionNode(cTVERSI, 4050, 450, "regimeTVA", "equals", "rsi", "TVA = RSI ?"))
	edges.push(nonEdge(cTVE, cTVERSI))

	const tTVERSI = "t_tve_3517"
	nodes.push(
		taskNode(tTVERSI, 3950, 600, "TVE - 3517", "TAXES", {
			cerfa: "3517",
			dateFormule: {
				type: "cloture_conditional",
				params: {
					dateA: { jour: 1, mois: 5, anneeOffset: 1 },
					dateB: { type: "relative_to_cloture", moisOffset: 3, joursOffset: 0 },
				},
			},
		}),
	)
	edges.push(ouiEdge(cTVERSI, tTVERSI))

	const nTVE = "n_tve"
	nodes.push(nothingNode(nTVE, 4200, 600))
	edges.push(nonEdge(cTVERSI, nTVE))

	// ═══════════════════════════════════════════════════════════════════════
	// Build final structure
	// ═══════════════════════════════════════════════════════════════════════
	let edgeCounter = 0
	return {
		nodes: nodes.map((n) => ({
			id: n.id,
			type: n.type,
			position: { x: n.x, y: n.y },
			data: n.data,
		})),
		edges: edges.map((e) => ({
			id: `e_${++edgeCounter}`,
			...e,
		})),
	}
}

// ─── Seed mutation ───────────────────────────────────────────────────────────

export const seedMindmap = internalMutation({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db.query("fiscalMindmap").first()
		if (existing) {
			return { status: "skipped", message: "Mind map existe déjà" }
		}

		const { nodes, edges } = buildMindmap()

		await ctx.db.insert("fiscalMindmap", {
			nodes,
			edges,
			updatedAt: Date.now(),
		})

		return { status: "seeded", nodes: nodes.length, edges: edges.length }
	},
})
