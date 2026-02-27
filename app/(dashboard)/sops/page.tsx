"use client"

import { useMutation, useQuery } from "convex/react"
import { BookOpen, Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { SopCard } from "@/components/sops/sop-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export default function SopsPage() {
	const router = useRouter()
	const { role: userRole } = useCurrentUser()
	const sops = useQuery(api.sops.list, { includeInactive: true })
	const categories = useQuery(api.sopCategories.list)
	const seedCategories = useMutation(api.sopCategories.seed)

	const canManage = userRole === "admin" || userRole === "manager"

	const [search, setSearch] = useState("")
	const [activeCategory, setActiveCategory] = useState<string | null>(null)
	const seeded = useRef(false)

	useEffect(() => {
		if (categories && categories.length === 0 && userRole === "admin" && !seeded.current) {
			seeded.current = true
			seedCategories().catch(() => {})
		}
	}, [categories, userRole, seedCategories])

	const filtered = useMemo(() => {
		if (!sops) return undefined
		return sops.filter((sop) => {
			if (search && !sop.nom.toLowerCase().includes(search.toLowerCase())) return false
			if (activeCategory && sop.categorySlug !== activeCategory) return false
			return true
		})
	}, [sops, search, activeCategory])

	// Group SOPs by category when viewing "Toutes"
	const groupedByCategory = useMemo(() => {
		if (!filtered || !categories || activeCategory) return null
		const groups: {
			nom: string
			slug: string
			color: string | null
			sops: typeof filtered
		}[] = []
		for (const cat of categories) {
			const catSops = filtered.filter((s) => s.categorySlug === cat.slug)
			if (catSops.length > 0) {
				groups.push({ nom: cat.nom, slug: cat.slug, color: cat.color ?? null, sops: catSops })
			}
		}
		// SOPs without category
		const uncategorized = filtered.filter((s) => !s.categorySlug)
		if (uncategorized.length > 0) {
			groups.push({ nom: "Autres", slug: "autres", color: null, sops: uncategorized })
		}
		return groups
	}, [filtered, categories, activeCategory])

	return (
		<div>
			<PageHeader
				title="SOPs"
				description="Procédures opérationnelles standards"
				actions={
					canManage ? (
						<Button onClick={() => router.push("/sops/new")}>
							<Plus className="mr-2 h-4 w-4" />
							Nouvelle SOP
						</Button>
					) : undefined
				}
			/>

			<div className="px-6 pt-4 space-y-4">
				{/* Search + Category filters */}
				<div className="space-y-3">
					<div className="relative max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher une SOP…"
							className="pl-9"
						/>
					</div>
					{categories && categories.length > 0 && (
						<div className="flex flex-wrap gap-2">
							<Badge
								variant={activeCategory === null ? "default" : "outline"}
								className="cursor-pointer"
								onClick={() => setActiveCategory(null)}
							>
								Toutes
							</Badge>
							{categories.map((cat) => (
								<Badge
									key={cat._id}
									variant={activeCategory === cat.slug ? "default" : "outline"}
									className="cursor-pointer"
									style={
										activeCategory === cat.slug && cat.color
											? { backgroundColor: cat.color, borderColor: cat.color, color: "#fff" }
											: cat.color
												? { borderColor: cat.color, color: cat.color }
												: undefined
									}
									onClick={() => setActiveCategory(activeCategory === cat.slug ? null : cat.slug)}
								>
									{cat.nom}
								</Badge>
							))}
						</div>
					)}
				</div>

				{/* Content */}
				{filtered === undefined ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="space-y-3">
								<Skeleton className="aspect-video w-full rounded-lg" />
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						))}
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">
							{search || activeCategory ? "Aucun résultat" : "Aucune SOP"}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							{search || activeCategory
								? "Essayez d'ajuster vos filtres."
								: "Créez des procédures pour standardiser le travail de l'équipe."}
						</p>
					</div>
				) : groupedByCategory ? (
					/* "Toutes" view — grouped by category sections */
					<div className="space-y-8">
						{groupedByCategory.map((group) => (
							<section key={group.slug}>
								<div className="flex items-center gap-3 mb-4">
									{group.color && (
										<span
											className="h-3 w-3 rounded-full shrink-0"
											style={{ backgroundColor: group.color }}
										/>
									)}
									<h2 className="font-heading text-base uppercase tracking-wide">{group.nom}</h2>
									<span className="text-xs text-muted-foreground">
										{group.sops.length} SOP{group.sops.length > 1 ? "s" : ""}
									</span>
									<div className="flex-1 border-b border-border" />
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{group.sops.map((sop, i) => (
										<SopCard
											key={sop._id}
											id={sop._id}
											nom={sop.nom}
											description={sop.description}
											categoryNom={sop.categoryNom}
											categoryColor={sop.categoryColor}
											videoUrl={sop.videoUrl}
											attachments={sop.attachments ?? undefined}
											isActive={sop.isActive}
											createdAt={sop.createdAt}
											index={i}
										/>
									))}
								</div>
							</section>
						))}
					</div>
				) : (
					/* Filtered category view — flat grid */
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filtered.map((sop, i) => (
							<SopCard
								key={sop._id}
								id={sop._id}
								nom={sop.nom}
								description={sop.description}
								categoryNom={sop.categoryNom}
								categoryColor={sop.categoryColor}
								videoUrl={sop.videoUrl}
								attachments={sop.attachments ?? undefined}
								isActive={sop.isActive}
								createdAt={sop.createdAt}
								index={i}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
