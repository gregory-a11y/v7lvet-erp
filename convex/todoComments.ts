import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserWithRole, safeGetAuthUserWithRole } from "./auth"

export const listByTodo = query({
	args: { todoId: v.id("todos") },
	handler: async (ctx, args) => {
		if (!(await safeGetAuthUserWithRole(ctx))) return []

		const comments = await ctx.db
			.query("todoComments")
			.withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
			.collect()

		comments.sort((a, b) => a.createdAt - b.createdAt)
		return comments
	},
})

export const create = mutation({
	args: {
		todoId: v.id("todos"),
		contenu: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		return ctx.db.insert("todoComments", {
			todoId: args.todoId,
			contenu: args.contenu,
			authorId: user.id as string,
			createdAt: Date.now(),
		})
	},
})

export const update = mutation({
	args: {
		id: v.id("todoComments"),
		contenu: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const comment = await ctx.db.get(args.id)
		if (!comment) throw new Error("Commentaire non trouvé")
		if (comment.authorId !== (user.id as string) && user.role !== "admin") {
			throw new Error("Vous ne pouvez modifier que vos propres commentaires")
		}

		await ctx.db.patch(args.id, {
			contenu: args.contenu,
			updatedAt: Date.now(),
		})
	},
})

export const remove = mutation({
	args: { id: v.id("todoComments") },
	handler: async (ctx, args) => {
		const user = await getAuthUserWithRole(ctx)

		const comment = await ctx.db.get(args.id)
		if (!comment) throw new Error("Commentaire non trouvé")
		if (comment.authorId !== (user.id as string) && user.role !== "admin") {
			throw new Error("Vous ne pouvez supprimer que vos propres commentaires")
		}

		await ctx.db.delete(args.id)
	},
})
