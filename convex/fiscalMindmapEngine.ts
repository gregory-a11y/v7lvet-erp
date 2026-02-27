import type { Doc } from "./_generated/dataModel"
import { calculateDate, evaluateCondition, type TaskToCreate } from "./fiscalEngine"

// ─── Types ───────────────────────────────────────────────────────────────────

type Client = Doc<"clients">

interface MindmapNode {
	id: string
	type: string
	position: { x: number; y: number }
	data: Record<string, unknown>
}

interface MindmapEdge {
	id: string
	source: string
	target: string
	sourceHandle?: string
	label?: string
}

// ─── Graph traversal engine ──────────────────────────────────────────────────

/**
 * Traverse the fiscal mindmap graph for a given client and exercise year.
 * Starts from all "start" nodes, follows edges based on condition evaluation.
 * Collects all tasks encountered during traversal.
 */
export function traverseMindmap(
	nodes: MindmapNode[],
	edges: MindmapEdge[],
	client: Client,
	exercice: number,
): TaskToCreate[] {
	const nodeMap = new Map<string, MindmapNode>()
	for (const node of nodes) {
		nodeMap.set(node.id, node)
	}

	// Build adjacency: source → edges
	const outgoing = new Map<string, MindmapEdge[]>()
	for (const edge of edges) {
		const list = outgoing.get(edge.source) ?? []
		list.push(edge)
		outgoing.set(edge.source, list)
	}

	const tasks: TaskToCreate[] = []
	const visited = new Set<string>()

	// Find start nodes
	const startNodes = nodes.filter((n) => n.type === "startNode")
	if (startNodes.length === 0) return tasks

	// BFS traversal
	const queue: string[] = startNodes.map((n) => n.id)

	while (queue.length > 0) {
		const currentId = queue.shift()!
		if (visited.has(currentId)) continue
		visited.add(currentId)

		const node = nodeMap.get(currentId)
		if (!node) continue

		const nodeEdges = outgoing.get(currentId) ?? []

		switch (node.type) {
			case "startNode":
			case "groupNode": {
				// Pass through — follow all outgoing edges
				for (const edge of nodeEdges) {
					queue.push(edge.target)
				}
				break
			}

			case "conditionNode": {
				// Evaluate condition and follow OUI or NON edge
				const condition = node.data as {
					champ: string
					operateur: string
					valeur?: unknown
				}
				const result = evaluateCondition(client, condition)

				for (const edge of nodeEdges) {
					if (result && edge.sourceHandle === "oui") {
						queue.push(edge.target)
					} else if (!result && edge.sourceHandle === "non") {
						queue.push(edge.target)
					}
				}
				break
			}

			case "taskNode": {
				// Collect the task
				const data = node.data as {
					nom: string
					categorie?: string
					cerfa?: string
					dateFormule?: { type: string; params: Record<string, unknown> }
					repeat?: { frequence: string; moisExclus?: number[] }
				}

				if (data.repeat) {
					// Expand repeated tasks
					const expanded = expandRepeatedTask(data, exercice, client)
					tasks.push(...expanded)
				} else {
					const dateEcheance = data.dateFormule
						? calculateDate(data.dateFormule, exercice, client)
						: undefined

					tasks.push({
						nom: data.nom,
						categorie: data.categorie,
						cerfa: data.cerfa,
						dateEcheance,
					})
				}

				// Tasks can also have outgoing edges (chaining)
				for (const edge of nodeEdges) {
					queue.push(edge.target)
				}
				break
			}

			case "nothingNode": {
				// Dead end — do nothing
				break
			}

			default: {
				// Unknown node type — follow all edges
				for (const edge of nodeEdges) {
					queue.push(edge.target)
				}
				break
			}
		}
	}

	return tasks
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOIS_NOMS = [
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

function expandRepeatedTask(
	data: {
		nom: string
		categorie?: string
		cerfa?: string
		dateFormule?: { type: string; params: Record<string, unknown> }
		repeat?: { frequence: string; moisExclus?: number[] }
	},
	exercice: number,
	client: Client,
): TaskToCreate[] {
	const result: TaskToCreate[] = []
	if (!data.repeat || !data.dateFormule) return result

	const { frequence, moisExclus = [] } = data.repeat

	if (frequence === "mensuelle") {
		for (let m = 1; m <= 12; m++) {
			if (moisExclus.includes(m)) continue
			const nom = data.nom.replace("{mois}", MOIS_NOMS[m - 1]).replace("{m}", String(m))
			const dateEcheance = calculateDate(
				{ ...data.dateFormule, params: { ...data.dateFormule.params, mois: m } },
				exercice,
				client,
			)
			result.push({ nom, categorie: data.categorie, cerfa: data.cerfa, dateEcheance })
		}
	} else if (frequence === "trimestrielle") {
		const labels = ["T1", "T2", "T3", "T4"]
		for (let q = 1; q <= 4; q++) {
			const qMonths = [q * 3 - 2, q * 3 - 1, q * 3]
			if (qMonths.some((m) => moisExclus.includes(m))) continue
			const nom = data.nom.replace("{trimestre}", labels[q - 1]).replace("{q}", String(q))
			const dateEcheance = calculateDate(
				{ ...data.dateFormule, params: { ...data.dateFormule.params, trimestre: q } },
				exercice,
				client,
			)
			result.push({ nom, categorie: data.categorie, cerfa: data.cerfa, dateEcheance })
		}
	}

	return result
}
