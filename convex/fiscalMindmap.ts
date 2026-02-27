import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole } from "./auth"
import { traverseMindmap } from "./fiscalMindmapEngine"
import { buildMindmap } from "./seedFiscalMindmap"

// ─── Queries ─────────────────────────────────────────────────────────────────

export const get = query({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}
		return ctx.db.query("fiscalMindmap").first()
	},
})

export const preview = query({
	args: {
		clientId: v.id("clients"),
		exercice: v.number(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin" && user.role !== "manager") {
			throw new Error("Non autorisé")
		}

		const client = await ctx.db.get(args.clientId)
		if (!client) throw new Error("Client non trouvé")

		const mindmap = await ctx.db.query("fiscalMindmap").first()
		if (!mindmap) return []

		return traverseMindmap(mindmap.nodes as any[], mindmap.edges as any[], client, args.exercice)
	},
})

// ─── Mutations ───────────────────────────────────────────────────────────────

export const save = mutation({
	args: {
		nodes: v.array(
			v.object({
				id: v.string(),
				type: v.string(),
				position: v.object({ x: v.number(), y: v.number() }),
				data: v.any(),
			}),
		),
		edges: v.array(
			v.object({
				id: v.string(),
				source: v.string(),
				target: v.string(),
				sourceHandle: v.optional(v.string()),
				label: v.optional(v.string()),
				animated: v.optional(v.boolean()),
				style: v.optional(v.any()),
			}),
		),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const existing = await ctx.db.query("fiscalMindmap").first()
		const now = Date.now()

		if (existing) {
			await ctx.db.patch(existing._id, {
				nodes: args.nodes,
				edges: args.edges,
				updatedAt: now,
			})
			return existing._id
		}

		return ctx.db.insert("fiscalMindmap", {
			nodes: args.nodes,
			edges: args.edges,
			updatedAt: now,
		})
	},
})

export const seed = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const existing = await ctx.db.query("fiscalMindmap").first()
		if (existing) {
			throw new Error("Une mind map existe déjà. Supprimez-la d'abord pour réinitialiser.")
		}

		const { nodes, edges } = buildMindmap()

		await ctx.db.insert("fiscalMindmap", {
			nodes,
			edges,
			updatedAt: Date.now(),
		})

		return { nodes: nodes.length, edges: edges.length }
	},
})

export const reset = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getAuthUserWithRole(ctx)
		if (user.role !== "admin") throw new Error("Non autorisé")

		const existing = await ctx.db.query("fiscalMindmap").first()
		if (existing) {
			await ctx.db.delete(existing._id)
		}

		const { nodes, edges } = buildMindmap()

		await ctx.db.insert("fiscalMindmap", {
			nodes,
			edges,
			updatedAt: Date.now(),
		})

		return { nodes: nodes.length, edges: edges.length }
	},
})
