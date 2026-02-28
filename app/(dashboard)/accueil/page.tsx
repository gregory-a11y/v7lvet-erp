"use client"

import { useMutation, useQuery } from "convex/react"
import { format, formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale/fr"
import type { Variants } from "framer-motion"
import { animate, motion, useMotionValue, useTransform } from "framer-motion"
import {
	AlertTriangle,
	ArrowRight,
	Bell,
	Building2,
	CalendarDays,
	CheckSquare,
	Clock,
	FolderOpen,
	Megaphone,
	MessageSquare,
	Pencil,
	Pin,
	PinOff,
	Plus,
	Sparkles,
	TicketCheck,
	Trash2,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUserContext } from "@/lib/contexts/current-user"
import { useTotalUnread } from "@/lib/hooks/use-total-unread"

// ─── Animation Variants ──────────────────────────────────────────

const dashboardStagger: Variants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.06,
			delayChildren: 0.15,
		},
	},
}

const cardReveal: Variants = {
	hidden: { opacity: 0, scale: 0.97, y: 8 },
	show: {
		opacity: 1,
		scale: 1,
		y: 0,
		transition: { type: "spring" as const, stiffness: 400, damping: 28 },
	},
}

const slideInFromBottom: Variants = {
	hidden: { opacity: 0, y: 24 },
	show: {
		opacity: 1,
		y: 0,
		transition: { type: "spring" as const, stiffness: 300, damping: 30 },
	},
}

const fadeInUp: Variants = {
	hidden: { opacity: 0, y: 10 },
	show: {
		opacity: 1,
		y: 0,
		transition: { type: "spring" as const, stiffness: 300, damping: 30 },
	},
}

// ─── Animated Counter ────────────────────────────────────────────

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
	const motionValue = useMotionValue(0)
	const rounded = useTransform(motionValue, (latest) => Math.round(latest).toString())
	const [display, setDisplay] = useState("0")

	useEffect(() => {
		const controls = animate(motionValue, value, {
			duration: 0.8,
			ease: "easeOut",
		})
		return controls.stop
	}, [motionValue, value])

	useEffect(() => {
		const unsubscribe = rounded.on("change", (v) => setDisplay(v))
		return unsubscribe
	}, [rounded])

	return <span className={className}>{display}</span>
}

// ─── Helpers ─────────────────────────────────────────────────────

function getGreeting(): string {
	const hour = new Date().getHours()
	if (hour < 12) return "Bonjour"
	if (hour < 18) return "Bon après-midi"
	return "Bonsoir"
}

// ─── Announcement Form Dialog ────────────────────────────────────

type AnnouncementFormData = {
	titre: string
	contenu: string
	type: "info" | "important" | "urgent"
	isPinned: boolean
	expiresAt: string
}

function AnnouncementDialog({
	open,
	onOpenChange,
	editingAnnouncement,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	editingAnnouncement?: {
		_id: Id<"announcements">
		titre: string
		contenu: string
		type: "info" | "important" | "urgent"
		isPinned: boolean
		expiresAt?: number
	} | null
}) {
	const createAnnouncement = useMutation(api.announcements.create)
	const updateAnnouncement = useMutation(api.announcements.update)

	const [form, setForm] = useState<AnnouncementFormData>({
		titre: "",
		contenu: "",
		type: "info",
		isPinned: false,
		expiresAt: "",
	})
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		if (editingAnnouncement) {
			setForm({
				titre: editingAnnouncement.titre,
				contenu: editingAnnouncement.contenu,
				type: editingAnnouncement.type,
				isPinned: editingAnnouncement.isPinned,
				expiresAt: editingAnnouncement.expiresAt
					? format(new Date(editingAnnouncement.expiresAt), "yyyy-MM-dd")
					: "",
			})
		} else {
			setForm({ titre: "", contenu: "", type: "info", isPinned: false, expiresAt: "" })
		}
	}, [editingAnnouncement])

	const handleSubmit = async () => {
		if (!form.titre.trim() || !form.contenu.trim()) return
		setSubmitting(true)
		try {
			const expiresAt = form.expiresAt ? new Date(form.expiresAt).getTime() : undefined
			if (editingAnnouncement) {
				await updateAnnouncement({
					id: editingAnnouncement._id,
					titre: form.titre.trim(),
					contenu: form.contenu.trim(),
					type: form.type,
					isPinned: form.isPinned,
					expiresAt,
				})
			} else {
				await createAnnouncement({
					titre: form.titre.trim(),
					contenu: form.contenu.trim(),
					type: form.type,
					isPinned: form.isPinned,
					expiresAt,
				})
			}
			onOpenChange(false)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="font-heading uppercase tracking-wider">
						{editingAnnouncement ? "Modifier l'annonce" : "Nouvelle annonce"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 pt-2">
					<div className="space-y-1.5">
						<Label htmlFor="ann-titre">Titre</Label>
						<Input
							id="ann-titre"
							value={form.titre}
							onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
							placeholder="Titre de l'annonce"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ann-contenu">Contenu</Label>
						<Textarea
							id="ann-contenu"
							value={form.contenu}
							onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))}
							placeholder="Contenu de l'annonce..."
							rows={4}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label>Type</Label>
							<Select
								value={form.type}
								onValueChange={(v) =>
									setForm((f) => ({ ...f, type: v as "info" | "important" | "urgent" }))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="info">Info</SelectItem>
									<SelectItem value="important">Important</SelectItem>
									<SelectItem value="urgent">Urgent</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="ann-expires">Expiration (optionnel)</Label>
							<Input
								id="ann-expires"
								type="date"
								value={form.expiresAt}
								onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
							/>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Switch
							checked={form.isPinned}
							onCheckedChange={(v) => setForm((f) => ({ ...f, isPinned: v }))}
						/>
						<Label>Épingler en haut</Label>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Annuler
						</Button>
						<Button onClick={handleSubmit} disabled={submitting || !form.titre.trim()}>
							{submitting ? "..." : editingAnnouncement ? "Modifier" : "Publier"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

// ─── Announcement Type Badge ─────────────────────────────────────

function AnnouncementTypeBadge({ type }: { type: "info" | "important" | "urgent" }) {
	const config = {
		info: { label: "Info", className: "bg-v7-emeraude/10 text-v7-emeraude border-v7-emeraude/20" },
		important: { label: "Important", className: "bg-amber-50 text-amber-700 border-amber-200" },
		urgent: {
			label: "Urgent",
			className: "bg-destructive/10 text-destructive border-destructive/20",
		},
	}
	const c = config[type]
	return (
		<Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${c.className}`}>
			{c.label}
		</Badge>
	)
}

// ─── Main Page ───────────────────────────────────────────────────

export default function AccueilPage() {
	const { user, isAdmin } = useCurrentUserContext()
	const totalUnread = useTotalUnread()

	const tachesStats = useQuery(api.taches.stats)
	const taches = useQuery(api.taches.list, {})

	const now = useMemo(() => Date.now(), [])
	const weekEnd = useMemo(() => now + 7 * 24 * 60 * 60 * 1000, [now])

	const upcomingEvents = useQuery(api.calendar.listTeamEvents, {
		start: now,
		end: weekEnd,
	})

	const notifications = useQuery(api.notifications.listForUser)
	const unreadNotifCount = useQuery(api.notifications.unreadCount)
	const announcements = useQuery(api.announcements.list)
	const removeAnnouncement = useMutation(api.announcements.remove)
	const togglePinAnnouncement = useMutation(api.announcements.togglePin)

	const userName = (user as Record<string, unknown>)?.name as string | undefined
	const todayFormatted = format(new Date(), "EEEE d MMMM yyyy", { locale: fr })

	const upcomingDeadlines = useMemo(() => {
		if (!taches) return []
		return taches
			.filter((t) => t.status !== "termine" && t.dateEcheance && t.dateEcheance <= weekEnd)
			.sort((a, b) => (a.dateEcheance ?? 0) - (b.dateEcheance ?? 0))
			.slice(0, 5)
	}, [taches, weekEnd])

	const overdueCount = tachesStats?.enRetard ?? 0
	const eventsCount = upcomingEvents?.length ?? 0
	const notifUnread = unreadNotifCount ?? 0

	// Announcement dialog state
	const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false)
	const [editingAnnouncement, setEditingAnnouncement] =
		useState<Parameters<typeof AnnouncementDialog>[0]["editingAnnouncement"]>(null)

	const openCreateAnnouncement = useCallback(() => {
		setEditingAnnouncement(null)
		setAnnouncementDialogOpen(true)
	}, [])

	const openEditAnnouncement = useCallback((a: NonNullable<typeof editingAnnouncement>) => {
		setEditingAnnouncement(a)
		setAnnouncementDialogOpen(true)
	}, [])

	return (
		<div className="min-h-screen bg-[#F4F5F3]">
			<motion.div
				variants={dashboardStagger}
				initial="hidden"
				animate="show"
				className="flex flex-col"
			>
				{/* ─── Hero Header ──────────────────────────────── */}
				<motion.div variants={fadeInUp} className="px-6 py-8 bg-white border-b">
					<div className="flex items-start justify-between">
						<div>
							<h1 className="text-3xl font-heading tracking-widest uppercase text-foreground">
								{getGreeting()}
								{userName ? `, ${userName}` : ""}
							</h1>
							<p className="text-sm text-muted-foreground mt-1.5 capitalize">{todayFormatted}</p>
						</div>
						<div className="flex items-center gap-2">
							<Link href="/messages">
								<Button variant="outline" size="sm" className="gap-1.5 text-xs">
									<MessageSquare className="h-3.5 w-3.5" />
									Messages
								</Button>
							</Link>
							<Link href="/calendrier">
								<Button variant="outline" size="sm" className="gap-1.5 text-xs">
									<CalendarDays className="h-3.5 w-3.5" />
									Calendrier
								</Button>
							</Link>
						</div>
					</div>
				</motion.div>

				<div className="px-6 py-6 space-y-6">
					{/* ─── Stats Row ───────────────────────────────── */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						{/* Messages non lus */}
						<motion.div variants={cardReveal}>
							<Link
								href="/messages"
								className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 border border-transparent hover:border-v7-amethyste/20 group block"
							>
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v7-amethyste/10 group-hover:bg-v7-amethyste/15 transition-colors">
									<MessageSquare className="h-5.5 w-5.5 text-v7-amethyste" />
								</div>
								<div>
									<div className="text-3xl font-heading text-foreground leading-none">
										<AnimatedCounter value={totalUnread} />
									</div>
									<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
										Messages non lus
									</div>
								</div>
							</Link>
						</motion.div>

						{/* Événements cette semaine */}
						<motion.div variants={cardReveal}>
							<Link
								href="/calendrier"
								className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 border border-transparent hover:border-v7-emeraude/20 group block"
							>
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v7-emeraude/10 group-hover:bg-v7-emeraude/15 transition-colors">
									<CalendarDays className="h-5.5 w-5.5 text-v7-emeraude" />
								</div>
								<div>
									<div className="text-3xl font-heading text-foreground leading-none">
										{upcomingEvents === undefined ? (
											<Skeleton className="h-8 w-8 inline-block" />
										) : (
											<AnimatedCounter value={eventsCount} />
										)}
									</div>
									<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
										Événements cette semaine
									</div>
								</div>
							</Link>
						</motion.div>

						{/* Tâches en retard */}
						<motion.div variants={cardReveal}>
							<Link
								href="/taches"
								className={`bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 border group block ${
									overdueCount > 0
										? "border-destructive/20 hover:border-destructive/30"
										: "border-transparent hover:border-green-200"
								}`}
							>
								<div
									className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
										overdueCount > 0
											? "bg-destructive/10 group-hover:bg-destructive/15"
											: "bg-green-50 group-hover:bg-green-100"
									}`}
								>
									{overdueCount > 0 ? (
										<AlertTriangle className="h-5.5 w-5.5 text-destructive" />
									) : (
										<Clock className="h-5.5 w-5.5 text-green-600" />
									)}
								</div>
								<div>
									<div
										className={`text-3xl font-heading leading-none ${
											overdueCount > 0 ? "text-destructive" : "text-green-600"
										}`}
									>
										{tachesStats === undefined ? (
											<Skeleton className="h-8 w-8 inline-block" />
										) : (
											<AnimatedCounter value={overdueCount} />
										)}
									</div>
									<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
										{overdueCount > 0 ? "Tâches en retard" : "Aucun retard"}
									</div>
								</div>
							</Link>
						</motion.div>

						{/* Notifications non lues */}
						<motion.div variants={cardReveal}>
							<Link
								href="/accueil#activite"
								className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 border border-transparent hover:border-v7-ocean/20 group block"
							>
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v7-ocean/10 group-hover:bg-v7-ocean/15 transition-colors">
									<Bell className="h-5.5 w-5.5 text-v7-ocean" />
								</div>
								<div>
									<div className="text-3xl font-heading text-foreground leading-none">
										{unreadNotifCount === undefined ? (
											<Skeleton className="h-8 w-8 inline-block" />
										) : (
											<AnimatedCounter value={notifUnread} />
										)}
									</div>
									<div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
										Notifications
									</div>
								</div>
							</Link>
						</motion.div>
					</div>

					{/* ─── Announcements Banner ────────────────────── */}
					{(announcements === undefined ||
						(announcements && announcements.length > 0) ||
						isAdmin) && (
						<motion.div variants={slideInFromBottom}>
							<div className="space-y-3">
								{/* Header */}
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Megaphone className="h-4 w-4 text-v7-emeraude" />
										<h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
											Annonces
										</h2>
									</div>
									{isAdmin && (
										<Button
											variant="outline"
											size="sm"
											className="gap-1.5 text-xs h-7"
											onClick={openCreateAnnouncement}
										>
											<Plus className="h-3 w-3" />
											Nouvelle annonce
										</Button>
									)}
								</div>

								{/* Announcements list */}
								{announcements === undefined ? (
									<div className="space-y-2">
										<Skeleton className="h-20 w-full rounded-xl" />
									</div>
								) : announcements.length === 0 ? (
									isAdmin ? (
										<div className="bg-white rounded-xl border border-dashed border-muted-foreground/20 p-6 text-center">
											<Megaphone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
											<p className="text-sm text-muted-foreground">
												Aucune annonce active. Créez-en une pour informer l'équipe.
											</p>
										</div>
									) : null
								) : (
									<div className="space-y-2">
										{announcements.map((a) => {
											const bgConfig = {
												info: "bg-v7-emeraude/5 border-v7-emeraude/20",
												important: "bg-amber-50 border-amber-200",
												urgent: "bg-destructive/5 border-destructive/20",
											}
											return (
												<div
													key={a._id}
													className={`rounded-xl border p-4 ${bgConfig[a.type]} transition-all`}
												>
													<div className="flex items-start justify-between gap-3">
														<div className="min-w-0 flex-1">
															<div className="flex items-center gap-2 mb-1">
																{a.isPinned && (
																	<Pin className="h-3 w-3 text-v7-amethyste shrink-0" />
																)}
																<AnnouncementTypeBadge type={a.type} />
																<span className="text-sm font-semibold truncate">{a.titre}</span>
															</div>
															<p className="text-sm text-muted-foreground leading-relaxed">
																{a.contenu}
															</p>
															<p className="text-[10px] text-muted-foreground/60 mt-2">
																{a.authorName} ·{" "}
																{formatDistanceToNow(new Date(a.createdAt), {
																	addSuffix: true,
																	locale: fr,
																})}
															</p>
														</div>
														{isAdmin && (
															<div className="flex items-center gap-1 shrink-0">
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7"
																	onClick={() => togglePinAnnouncement({ id: a._id })}
																	title={a.isPinned ? "Désépingler" : "Épingler"}
																>
																	{a.isPinned ? (
																		<PinOff className="h-3.5 w-3.5" />
																	) : (
																		<Pin className="h-3.5 w-3.5" />
																	)}
																</Button>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7"
																	onClick={() => openEditAnnouncement(a)}
																>
																	<Pencil className="h-3.5 w-3.5" />
																</Button>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7 text-destructive hover:text-destructive"
																	onClick={() => removeAnnouncement({ id: a._id })}
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</Button>
															</div>
														)}
													</div>
												</div>
											)
										})}
									</div>
								)}
							</div>
						</motion.div>
					)}

					{/* ─── Main Grid ───────────────────────────────── */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* ─── Col 1-2: Events + Deadlines ─────────── */}
						<div className="lg:col-span-2 space-y-6">
							{/* Upcoming events */}
							<motion.div variants={fadeInUp} className="bg-white rounded-xl shadow-sm p-5">
								<div className="flex items-center justify-between mb-4">
									<p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
										Prochains événements
									</p>
									<Link href="/calendrier">
										<Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
											Voir tout <ArrowRight className="h-3 w-3" />
										</Button>
									</Link>
								</div>
								{upcomingEvents === undefined ? (
									<div className="space-y-3">
										{Array.from({ length: 3 }).map((_, i) => (
											<Skeleton key={`evt-${i}`} className="h-14 w-full rounded-lg" />
										))}
									</div>
								) : upcomingEvents.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-10 text-center">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v7-emeraude/10 mx-auto mb-3">
											<CalendarDays className="h-6 w-6 text-v7-emeraude" />
										</div>
										<p className="text-sm font-medium text-foreground">Semaine libre</p>
										<p className="text-[11px] text-muted-foreground mt-1">
											Aucun événement prévu cette semaine
										</p>
										<Link href="/calendrier" className="mt-3">
											<Button variant="outline" size="sm" className="text-xs gap-1.5">
												<Plus className="h-3 w-3" />
												Créer un événement
											</Button>
										</Link>
									</div>
								) : (
									<div className="space-y-1.5">
										{upcomingEvents.slice(0, 6).map((evt) => (
											<Link
												key={evt._id}
												href="/calendrier"
												className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
											>
												<div className="flex flex-col items-center justify-center rounded-lg bg-v7-emeraude/10 text-v7-emeraude px-2.5 py-1.5 min-w-[48px]">
													<span className="text-lg font-heading leading-none">
														{format(new Date(evt.startAt), "d")}
													</span>
													<span className="text-[10px] uppercase">
														{format(new Date(evt.startAt), "MMM", { locale: fr })}
													</span>
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium truncate">{evt.title}</p>
													<p className="text-[11px] text-muted-foreground">
														{evt.allDay
															? "Toute la journée"
															: format(new Date(evt.startAt), "HH:mm", {
																	locale: fr,
																})}
														{evt.location && ` · ${evt.location}`}
													</p>
												</div>
												<ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
											</Link>
										))}
									</div>
								)}
							</motion.div>

							{/* Upcoming deadlines */}
							<motion.div variants={fadeInUp} className="bg-white rounded-xl shadow-sm p-5">
								<div className="flex items-center justify-between mb-4">
									<p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
										Échéances à venir
									</p>
									<Link href="/taches">
										<Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
											Voir tout <ArrowRight className="h-3 w-3" />
										</Button>
									</Link>
								</div>
								{taches === undefined ? (
									<div className="space-y-3">
										{Array.from({ length: 3 }).map((_, i) => (
											<Skeleton key={`dl-${i}`} className="h-14 w-full rounded-lg" />
										))}
									</div>
								) : upcomingDeadlines.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-10 text-center">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 mx-auto mb-3">
											<CheckSquare className="h-6 w-6 text-green-600" />
										</div>
										<p className="text-sm font-medium text-foreground">Aucune échéance</p>
										<p className="text-[11px] text-muted-foreground mt-1">
											Pas d'échéance prévue cette semaine
										</p>
									</div>
								) : (
									<div className="space-y-1.5">
										{upcomingDeadlines.map((tache) => {
											const isOverdue = tache.dateEcheance && tache.dateEcheance < Date.now()
											return (
												<Link
													key={tache._id}
													href={`/taches/${tache._id}`}
													className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
												>
													<div
														className={`flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[48px] ${
															isOverdue
																? "bg-destructive/10 text-destructive"
																: "bg-amber-50 text-amber-700"
														}`}
													>
														<span className="text-lg font-heading leading-none">
															{tache.dateEcheance ? format(new Date(tache.dateEcheance), "d") : "—"}
														</span>
														<span className="text-[10px] uppercase">
															{tache.dateEcheance
																? format(new Date(tache.dateEcheance), "MMM", {
																		locale: fr,
																	})
																: ""}
														</span>
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-sm font-medium truncate">{tache.nom}</p>
														<p className="text-[11px] text-muted-foreground">
															{tache.clientName}
															{isOverdue && (
																<span className="ml-1.5 text-destructive font-medium">
																	En retard
																</span>
															)}
														</p>
													</div>
													<ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
												</Link>
											)
										})}
									</div>
								)}
							</motion.div>
						</div>

						{/* ─── Col 3: Activity + Quick Links ──────── */}
						<div className="space-y-6" id="activite">
							{/* Activity feed */}
							<motion.div variants={fadeInUp} className="bg-white rounded-xl shadow-sm p-5">
								<div className="flex items-center justify-between mb-4">
									<p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
										Activité récente
									</p>
									{notifUnread > 0 && (
										<Badge
											variant="outline"
											className="text-[10px] bg-v7-amethyste/10 text-v7-amethyste border-v7-amethyste/20"
										>
											{notifUnread} non lue{notifUnread > 1 ? "s" : ""}
										</Badge>
									)}
								</div>
								{notifications === undefined ? (
									<div className="space-y-3">
										{Array.from({ length: 4 }).map((_, i) => (
											<Skeleton key={`notif-${i}`} className="h-12 w-full rounded-lg" />
										))}
									</div>
								) : notifications.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8 text-center">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-v7-emeraude/10 mx-auto mb-3">
											<Sparkles className="h-6 w-6 text-v7-emeraude" />
										</div>
										<p className="text-sm font-medium text-foreground">Tout est à jour</p>
										<p className="text-[11px] text-muted-foreground mt-1">
											Les notifications apparaîtront ici
										</p>
									</div>
								) : (
									<div className="space-y-1">
										{notifications.slice(0, 8).map((notif) => (
											<div
												key={notif._id}
												className={`p-2.5 rounded-lg text-sm transition-colors ${
													notif.isRead
														? "text-muted-foreground"
														: "bg-v7-amethyste/5 text-foreground"
												}`}
											>
												<p className="font-medium text-xs truncate">{notif.titre}</p>
												<p className="text-[11px] text-muted-foreground truncate mt-0.5">
													{notif.message}
												</p>
												<p className="text-[10px] text-muted-foreground/60 mt-1">
													{formatDistanceToNow(new Date(notif.createdAt), {
														addSuffix: true,
														locale: fr,
													})}
												</p>
											</div>
										))}
									</div>
								)}
							</motion.div>

							{/* Quick links */}
							<motion.div variants={fadeInUp} className="bg-white rounded-xl shadow-sm p-5">
								<p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
									Raccourcis
								</p>
								<div className="space-y-1">
									{[
										{
											href: "/clients",
											label: "Clients",
											icon: Building2,
											color: "text-v7-emeraude bg-v7-emeraude/10",
										},
										{
											href: "/taches",
											label: "Tâches",
											icon: CheckSquare,
											color: "text-v7-amethyste bg-v7-amethyste/10",
										},
										{
											href: "/dossiers",
											label: "Dossiers",
											icon: FolderOpen,
											color: "text-v7-ocean bg-v7-ocean/10",
										},
										{
											href: "/tickets",
											label: "Tickets",
											icon: TicketCheck,
											color: "text-amber-600 bg-amber-50",
										},
									].map((link) => (
										<Link
											key={link.href}
											href={link.href}
											className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm group"
										>
											<div
												className={`flex h-8 w-8 items-center justify-center rounded-lg ${link.color}`}
											>
												<link.icon className="h-4 w-4" />
											</div>
											<span className="font-medium">{link.label}</span>
											<ArrowRight className="h-3 w-3 text-muted-foreground/40 ml-auto group-hover:translate-x-0.5 transition-transform" />
										</Link>
									))}
								</div>
							</motion.div>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Announcement Dialog */}
			{isAdmin && (
				<AnnouncementDialog
					open={announcementDialogOpen}
					onOpenChange={setAnnouncementDialogOpen}
					editingAnnouncement={editingAnnouncement}
				/>
			)}
		</div>
	)
}
