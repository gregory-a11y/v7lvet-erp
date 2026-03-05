/**
 * Seed & test pour les automations multi-tâches.
 *
 * Usage :
 *   bunx convex run testAutomations:seedDemoAutomations
 *   bunx convex run testAutomations:runAllTests
 */
import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"

// Helper pour logger proprement
function log(label: string, ok: boolean, detail?: string) {
	const icon = ok ? "✅" : "❌"
	console.log(`${icon} ${label}${detail ? ` — ${detail}` : ""}`)
}

// =============================================================================
// SEED — Crée des automations réalistes qui RESTENT en base
// =============================================================================

export const seedDemoAutomations = internalMutation({
	args: {},
	handler: async (ctx) => {
		console.log("\n========== SEED AUTOMATIONS DEMO ==========\n")

		const now = Date.now()
		const pastTime = now - 3600000 // 1h ago — prêt à exécuter

		// Cleanup existing demo automations first
		const existing = await ctx.db.query("taskAutomations").collect()
		for (const auto of existing) {
			if (auto.nom.startsWith("DEMO —")) {
				const logs = await ctx.db
					.query("taskAutomationLogs")
					.withIndex("by_automation", (q) => q.eq("automationId", auto._id))
					.collect()
				for (const l of logs) await ctx.db.delete(l._id)
				const todos = await ctx.db.query("todos").collect()
				for (const t of todos) {
					if (t.automationId === auto._id) await ctx.db.delete(t._id)
				}
				await ctx.db.delete(auto._id)
			}
		}

		const created: string[] = []

		// ─── 1. Reporting mensuel équipe (tous les 10 du mois) ───
		const id1 = await ctx.db.insert("taskAutomations", {
			nom: "DEMO — Reporting mensuel équipe",
			description:
				"Génère un reporting mensuel pour toute l'équipe : préparation, envoi et archivage.",
			mode: "equipe",
			cibleEquipe: "tous",
			planificationType: "frequence",
			frequence: "mensuel",
			jourMois: 10,
			taches: [
				{
					id: "t1",
					titre: "Préparer reporting {{mois}} {{annee}}",
					priorite: "haute",
					categorie: "reporting",
				},
				{
					id: "t2",
					titre: "Envoyer CR mensuel à la direction",
					priorite: "normale",
					echeanceJoursApres: 3,
				},
				{
					id: "t3",
					titre: "Archiver documents du mois",
					priorite: "basse",
					categorie: "administratif",
					echeanceJoursApres: 7,
				},
			],
			isActive: true,
			nextExecutionAt: pastTime,
			createdById: "seed",
			createdAt: now,
			updatedAt: now,
		})
		created.push(`1. Reporting mensuel équipe → ${id1}`)

		// ─── 2. Déclaration TVA clients IS / Réel normal / Trimestriel ───
		const id2 = await ctx.db.insert("taskAutomations", {
			nom: "DEMO — Déclaration TVA trimestrielle (IS + réel normal)",
			description: "Pour les clients IS au régime réel normal, trimestriel le 15 du mois.",
			mode: "client",
			assignationClient: "responsable_operationnel",
			filtresCategorieFiscale: "IS",
			filtresRegimeTVA: "reel_normal",
			planificationType: "frequence",
			frequence: "trimestriel",
			jourMois: 15,
			moisTrimestre: 1,
			taches: [
				{
					id: "t1",
					titre: "Déclaration TVA — {{client}} — {{trimestre}} {{annee}}",
					priorite: "haute",
					categorie: "fiscal",
					echeanceJoursApres: 5,
				},
				{
					id: "t2",
					titre: "Vérifier rapprochement bancaire — {{client}}",
					priorite: "normale",
					categorie: "comptabilite",
				},
			],
			isActive: true,
			nextExecutionAt: pastTime,
			createdById: "seed",
			createdAt: now,
			updatedAt: now,
		})
		created.push(`2. TVA trimestrielle IS → ${id2}`)

		// ─── 3. Préparation clôture comptable J-15 (date_relative) ───
		const id3 = await ctx.db.insert("taskAutomations", {
			nom: "DEMO — Préparation clôture comptable J-15",
			description: "15 jours avant la clôture, préparer les écritures et contrôles.",
			mode: "client",
			assignationClient: "responsable_operationnel",
			planificationType: "date_relative",
			dateReference: "dateClotureComptable",
			joursDecalage: -15,
			periodeRelative: "annuel",
			taches: [
				{
					id: "t1",
					titre: "Préparer clôture {{client}} — {{annee}}",
					priorite: "urgente",
					categorie: "comptabilite",
					echeanceJoursApres: 10,
				},
				{
					id: "t2",
					titre: "Contrôle pièces justificatives — {{client}}",
					priorite: "haute",
					categorie: "comptabilite",
					echeanceJoursApres: 12,
				},
			],
			isActive: true,
			nextExecutionAt: pastTime,
			createdById: "seed",
			createdAt: now,
			updatedAt: now,
		})
		created.push(`3. Clôture comptable J-15 → ${id3}`)

		// ─── 4. Check-list hebdo managers ───
		const id4 = await ctx.db.insert("taskAutomations", {
			nom: "DEMO — Check-list hebdo managers",
			description: "Chaque lundi, les managers doivent faire le point sur leurs dossiers.",
			mode: "equipe",
			cibleEquipe: "par_role",
			cibleRole: "manager",
			planificationType: "frequence",
			frequence: "hebdomadaire",
			jourSemaine: 1, // Lundi
			taches: [
				{
					id: "t1",
					titre: "Revue dossiers en cours",
					priorite: "haute",
				},
				{
					id: "t2",
					titre: "Mettre à jour le suivi d'activité",
					priorite: "normale",
					echeanceJoursApres: 2,
				},
			],
			isActive: true,
			nextExecutionAt: pastTime,
			createdById: "seed",
			createdAt: now,
			updatedAt: now,
		})
		created.push(`4. Check-list hebdo managers → ${id4}`)

		// ─── 5. Automation inactive (pour tester le toggle) ───
		const id5 = await ctx.db.insert("taskAutomations", {
			nom: "DEMO — Bilan annuel clients IR (inactive)",
			description: "Annuel, pour les clients IR. Inactive pour le moment.",
			mode: "client",
			assignationClient: "responsable_hierarchique",
			filtresCategorieFiscale: "IR",
			planificationType: "frequence",
			frequence: "annuel",
			jourMois: 1,
			moisAnnee: 4, // Avril
			taches: [
				{
					id: "t1",
					titre: "Bilan annuel {{client}} — {{annee}}",
					priorite: "urgente",
					categorie: "fiscal",
					echeanceJoursApres: 30,
				},
			],
			isActive: false,
			createdById: "seed",
			createdAt: now,
			updatedAt: now,
		})
		created.push(`5. Bilan annuel IR (inactive) → ${id5}`)

		console.log("Automations créées :")
		for (const c of created) console.log(`  ${c}`)

		// ─── Exécuter les automations actives ───
		console.log("\nExécution des automations actives...")
		const activeIds = [id1, id2, id3, id4]
		for (const id of activeIds) {
			await ctx.scheduler.runAfter(0, internal.taskAutomations.executeOneAutomation, {
				automationId: id,
			})
		}

		console.log(
			`\n========== ${created.length} automations créées, ${activeIds.length} schedulées ==========\n`,
		)

		return { created: created.length, executed: activeIds.length }
	},
})

// =============================================================================
// TESTS — Ne suppriment rien, juste des vérifications
// =============================================================================

export const runAllTests = internalMutation({
	args: {},
	handler: async (ctx) => {
		console.log("\n========== TESTS AUTOMATIONS MULTI-TÂCHES ==========\n")

		const now = Date.now()
		const results: { label: string; ok: boolean; detail?: string }[] = []

		// ─── TEST 1: Création automation équipe / mensuel / 3 tâches ───
		try {
			const id1 = await ctx.db.insert("taskAutomations", {
				nom: "TEST — Reporting mensuel équipe",
				mode: "equipe",
				cibleEquipe: "tous",
				planificationType: "frequence",
				frequence: "mensuel",
				jourMois: 10,
				taches: [
					{ id: "t1", titre: "Préparer reporting {{mois}} {{annee}}", priorite: "haute" },
					{
						id: "t2",
						titre: "Envoyer CR mensuel",
						priorite: "normale",
						echeanceJoursApres: 3,
					},
					{
						id: "t3",
						titre: "Archiver documents du mois",
						priorite: "basse",
						categorie: "administratif",
					},
				],
				isActive: true,
				nextExecutionAt: now + 86400000,
				createdById: "test-user",
				createdAt: now,
				updatedAt: now,
			})
			const auto1 = await ctx.db.get(id1)
			const ok = auto1 !== null && auto1.taches.length === 3
			results.push({
				label: "TEST 1: Création équipe/mensuel/3 tâches",
				ok,
				detail: `id=${id1}, taches=${auto1?.taches.length}`,
			})

			// Cleanup
			await ctx.db.delete(id1)
		} catch (e: unknown) {
			results.push({
				label: "TEST 1: Création équipe/mensuel/3 tâches",
				ok: false,
				detail: (e as Error).message,
			})
		}

		// ─── TEST 2: Création automation client / fréquence / avec filtres ───
		try {
			const id2 = await ctx.db.insert("taskAutomations", {
				nom: "TEST — Déclaration TVA clients IS",
				mode: "client",
				assignationClient: "responsable_operationnel",
				filtresCategorieFiscale: "IS",
				filtresRegimeTVA: "reel_normal",
				planificationType: "frequence",
				frequence: "trimestriel",
				jourMois: 15,
				moisTrimestre: 1,
				taches: [
					{
						id: "t1",
						titre: "Déclaration TVA — {{client}} — {{trimestre}} {{annee}}",
						priorite: "haute",
						echeanceJoursApres: 5,
					},
					{
						id: "t2",
						titre: "Vérifier rapprochement bancaire — {{client}}",
						priorite: "normale",
					},
				],
				isActive: true,
				nextExecutionAt: now + 86400000,
				createdById: "test-user",
				createdAt: now,
				updatedAt: now,
			})
			const auto2 = await ctx.db.get(id2)
			const ok =
				auto2 !== null &&
				auto2.taches.length === 2 &&
				auto2.filtresCategorieFiscale === "IS" &&
				auto2.filtresRegimeTVA === "reel_normal"
			results.push({
				label: "TEST 2: Création client/trimestriel/IS+réel_normal/2 tâches",
				ok,
				detail: `filtres OK, taches=${auto2?.taches.length}`,
			})

			await ctx.db.delete(id2)
		} catch (e: unknown) {
			results.push({
				label: "TEST 2: Création client/trimestriel/filtres",
				ok: false,
				detail: (e as Error).message,
			})
		}

		// ─── TEST 3: Création client / date_relative ───
		try {
			const id3 = await ctx.db.insert("taskAutomations", {
				nom: "TEST — Clôture comptable J-15",
				mode: "client",
				assignationClient: "responsable_operationnel",
				planificationType: "date_relative",
				dateReference: "dateClotureComptable",
				joursDecalage: -15,
				taches: [
					{
						id: "t1",
						titre: "Préparer clôture {{client}} — {{annee}}",
						priorite: "urgente",
						echeanceJoursApres: 10,
					},
				],
				isActive: true,
				nextExecutionAt: now + 86400000,
				createdById: "test-user",
				createdAt: now,
				updatedAt: now,
			})
			const auto3 = await ctx.db.get(id3)
			const ok =
				auto3 !== null &&
				auto3.planificationType === "date_relative" &&
				auto3.joursDecalage === -15 &&
				auto3.dateReference === "dateClotureComptable"
			results.push({
				label: "TEST 3: Création client/date_relative/clôture J-15",
				ok,
				detail: `decalage=${auto3?.joursDecalage}, ref=${auto3?.dateReference}`,
			})

			await ctx.db.delete(id3)
		} catch (e: unknown) {
			results.push({
				label: "TEST 3: Création client/date_relative",
				ok: false,
				detail: (e as Error).message,
			})
		}

		// ─── TEST 4: Exécution moteur — mode équipe multi-tâches ───
		try {
			const pastTime = now - 3600000
			const id4 = await ctx.db.insert("taskAutomations", {
				nom: "TEST — Exec équipe multi-tâches",
				mode: "equipe",
				cibleEquipe: "tous",
				planificationType: "frequence",
				frequence: "quotidien",
				taches: [
					{ id: "t1", titre: "Tâche A test exec", priorite: "normale" },
					{ id: "t2", titre: "Tâche B test exec", priorite: "haute" },
				],
				isActive: true,
				nextExecutionAt: pastTime,
				createdById: "test-user",
				createdAt: now,
				updatedAt: now,
			})

			await ctx.scheduler.runAfter(0, internal.taskAutomations.executeOneAutomation, {
				automationId: id4,
			})

			results.push({
				label: "TEST 4: Exécution moteur équipe (scheduled)",
				ok: true,
				detail: `automation ${id4} scheduled for execution`,
			})
		} catch (e: unknown) {
			results.push({
				label: "TEST 4: Exécution moteur équipe",
				ok: false,
				detail: (e as Error).message,
			})
		}

		// ─── TEST 5: Toggle active/inactive ───
		try {
			const id5 = await ctx.db.insert("taskAutomations", {
				nom: "TEST — Toggle",
				mode: "equipe",
				cibleEquipe: "tous",
				planificationType: "frequence",
				frequence: "mensuel",
				jourMois: 1,
				taches: [{ id: "t1", titre: "Test toggle", priorite: "normale" }],
				isActive: true,
				nextExecutionAt: now + 86400000,
				createdById: "test-user",
				createdAt: now,
				updatedAt: now,
			})

			await ctx.db.patch(id5, { isActive: false, nextExecutionAt: undefined })
			const afterOff = await ctx.db.get(id5)
			const offOk =
				afterOff !== null && !afterOff.isActive && afterOff.nextExecutionAt === undefined

			await ctx.db.patch(id5, { isActive: true, nextExecutionAt: now + 86400000 })
			const afterOn = await ctx.db.get(id5)
			const onOk = !!afterOn?.isActive && afterOn.nextExecutionAt !== undefined

			results.push({
				label: "TEST 5: Toggle active/inactive",
				ok: offOk && onOk,
				detail: `off: isActive=${afterOff?.isActive}, nextExec=${afterOff?.nextExecutionAt} | on: isActive=${afterOn?.isActive}`,
			})

			await ctx.db.delete(id5)
		} catch (e: unknown) {
			results.push({
				label: "TEST 5: Toggle active/inactive",
				ok: false,
				detail: (e as Error).message,
			})
		}

		// ─── TEST 6: Update — ajout/suppression de tâches ───
		try {
			const id6 = await ctx.db.insert("taskAutomations", {
				nom: "TEST — Update tâches",
				mode: "equipe",
				cibleEquipe: "par_role",
				cibleRole: "manager",
				planificationType: "frequence",
				frequence: "hebdomadaire",
				jourSemaine: 0,
				taches: [{ id: "t1", titre: "Tâche initiale", priorite: "normale" }],
				isActive: true,
				nextExecutionAt: now + 86400000,
				createdById: "test-user",
				createdAt: now,
				updatedAt: now,
			})

			await ctx.db.patch(id6, {
				taches: [
					{ id: "t1", titre: "Tâche initiale (modifiée)", priorite: "haute" },
					{ id: "t2", titre: "Nouvelle tâche 2", priorite: "normale" },
					{
						id: "t3",
						titre: "Nouvelle tâche 3",
						priorite: "basse",
						echeanceJoursApres: 7,
					},
				],
				updatedAt: Date.now(),
			})

			const updated = await ctx.db.get(id6)
			const ok =
				updated !== null &&
				updated.taches.length === 3 &&
				updated.taches[0].titre === "Tâche initiale (modifiée)" &&
				updated.taches[0].priorite === "haute" &&
				updated.taches[2].echeanceJoursApres === 7

			results.push({
				label: "TEST 6: Update — 1→3 tâches + modification",
				ok,
				detail: `taches=${updated?.taches.length}, titre[0]="${updated?.taches[0].titre}"`,
			})

			await ctx.db.delete(id6)
		} catch (e: unknown) {
			results.push({
				label: "TEST 6: Update tâches",
				ok: false,
				detail: (e as Error).message,
			})
		}

		// ─── TEST 7: Interpolation des variables ───
		try {
			const id7 = await ctx.db.insert("taskAutomations", {
				nom: "TEST — Interpolation",
				mode: "client",
				assignationClient: "responsable_operationnel",
				planificationType: "frequence",
				frequence: "mensuel",
				jourMois: 1,
				taches: [
					{
						id: "t1",
						titre: "Décla TVA {{client}} — {{mois}} {{annee}} ({{trimestre}})",
						priorite: "haute",
					},
					{
						id: "t2",
						titre: "Vérif {{responsable}} pour {{prestation}}",
						priorite: "normale",
					},
				],
				isActive: true,
				nextExecutionAt: now + 86400000,
				createdById: "test-user",
				createdAt: now,
				updatedAt: now,
			})
			const auto7 = await ctx.db.get(id7)
			const t1 = auto7?.taches[0].titre ?? ""
			const t2 = auto7?.taches[1].titre ?? ""
			const hasAllVars =
				t1.includes("{{client}}") &&
				t1.includes("{{mois}}") &&
				t1.includes("{{annee}}") &&
				t1.includes("{{trimestre}}") &&
				t2.includes("{{responsable}}") &&
				t2.includes("{{prestation}}")

			results.push({
				label: "TEST 7: Variables d'interpolation stockées correctement",
				ok: hasAllVars,
				detail: `t1="${t1}", t2="${t2}"`,
			})

			await ctx.db.delete(id7)
		} catch (e: unknown) {
			results.push({
				label: "TEST 7: Interpolation",
				ok: false,
				detail: (e as Error).message,
			})
		}

		// ─── TEST 8: Idempotency logs ───
		try {
			const tempAutoId = await ctx.db.insert("taskAutomations", {
				nom: "TEST — Idempotency temp",
				mode: "equipe",
				cibleEquipe: "tous",
				planificationType: "frequence",
				frequence: "quotidien",
				taches: [{ id: "t1", titre: "temp", priorite: "normale" }],
				isActive: false,
				createdById: "test-user",
				createdAt: now,
				updatedAt: now,
			})
			const idempKey = `test_idemp_${now}`
			await ctx.db.insert("taskAutomationLogs", {
				automationId: tempAutoId,
				executedAt: now,
				idempotencyKey: idempKey,
				todosCreated: 3,
			})

			const found = await ctx.db
				.query("taskAutomationLogs")
				.withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempKey))
				.first()

			const ok = found !== null && found.todosCreated === 3
			results.push({
				label: "TEST 8: Idempotency log — insert + query by key",
				ok,
				detail: `found=${!!found}, todosCreated=${found?.todosCreated}`,
			})

			if (found) await ctx.db.delete(found._id)
			await ctx.db.delete(tempAutoId)
		} catch (e: unknown) {
			results.push({
				label: "TEST 8: Idempotency logs",
				ok: false,
				detail: (e as Error).message,
			})
		}

		// ─── Cleanup test 4 leftover ───
		const leftover = await ctx.db.query("taskAutomations").collect()
		for (const auto of leftover) {
			if (auto.nom.startsWith("TEST — ")) {
				const logs = await ctx.db
					.query("taskAutomationLogs")
					.withIndex("by_automation", (q) => q.eq("automationId", auto._id))
					.collect()
				for (const l of logs) await ctx.db.delete(l._id)
				const todos = await ctx.db.query("todos").collect()
				for (const t of todos) {
					if (t.automationId === auto._id) await ctx.db.delete(t._id)
				}
				await ctx.db.delete(auto._id)
			}
		}

		// ─── RÉSULTATS ───
		console.log("")
		for (const r of results) {
			log(r.label, r.ok, r.detail)
		}

		const passed = results.filter((r) => r.ok).length
		const total = results.length
		console.log(`\n========== ${passed}/${total} tests passés ==========\n`)

		return { passed, total, results: results.map((r) => ({ ...r })) }
	},
})
