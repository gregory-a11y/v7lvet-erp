"use client"

import { useQuery } from "convex/react"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

const MOIS = [
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

const STATUS_COLORS: Record<string, string> = {
	a_venir: "bg-gray-200 border-gray-400",
	en_cours: "bg-emerald-100 border-emerald-400",
	en_attente: "bg-amber-100 border-amber-400",
	termine: "bg-green-200 border-green-500",
}

export default function GanttPage() {
	const router = useRouter()
	const now = new Date()
	const [mois, setMois] = useState(now.getMonth())
	const [annee, setAnnee] = useState(now.getFullYear())

	const startDate = useMemo(() => new Date(annee, mois, 1).getTime(), [annee, mois])
	const endDate = useMemo(() => new Date(annee, mois + 1, 0, 23, 59, 59).getTime(), [annee, mois])
	const nbJours = useMemo(() => new Date(annee, mois + 1, 0).getDate(), [annee, mois])

	const taches = useQuery(api.taches.listForGantt, { startDate, endDate })

	const annees = [annee - 1, annee, annee + 1]

	function getDayOffset(ts: number): number {
		const d = new Date(ts)
		return d.getDate() - 1 // 0-indexed
	}

	function isOverdue(ts: number, status: string): boolean {
		return status !== "termine" && ts < Date.now()
	}

	return (
		<div>
			<PageHeader
				title="Vue Gantt"
				description="Timeline des tâches par échéance"
				actions={
					<Button variant="ghost" size="sm" onClick={() => router.push("/taches")}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Liste
					</Button>
				}
			/>

			{/* Sélecteurs mois/année */}
			<div className="flex gap-3 px-6 py-3">
				<Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
					<SelectTrigger className="w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{MOIS.map((m, i) => (
							<SelectItem key={i} value={String(i)}>
								{m}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={String(annee)} onValueChange={(v) => setAnnee(Number(v))}>
					<SelectTrigger className="w-28">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{annees.map((a) => (
							<SelectItem key={a} value={String(a)}>
								{a}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="px-6 overflow-x-auto">
				{taches === undefined ? (
					<div className="py-8 text-center text-muted-foreground">Chargement…</div>
				) : taches.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium">Aucune tâche ce mois-ci</p>
					</div>
				) : (
					<div className="border rounded-lg overflow-hidden">
						{/* En-tête : jours */}
						<div className="flex border-b bg-muted/50">
							<div className="w-52 shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground border-r">
								Tâche
							</div>
							<div className="flex flex-1">
								{Array.from({ length: nbJours }).map((_, i) => {
									const d = new Date(annee, mois, i + 1)
									const isWeekend = d.getDay() === 0 || d.getDay() === 6
									const isToday =
										d.getDate() === now.getDate() &&
										d.getMonth() === now.getMonth() &&
										d.getFullYear() === now.getFullYear()
									return (
										<div
											key={i}
											className={cn(
												"flex-1 text-center text-xs py-2 border-r last:border-r-0",
												isWeekend && "bg-muted",
												isToday && "bg-primary/10 text-primary font-bold",
											)}
										>
											{i + 1}
										</div>
									)
								})}
							</div>
						</div>

						{/* Lignes tâches */}
						{taches.map((tache) => {
							const dayIndex = getDayOffset(tache.dateEcheance!)
							const overdue = isOverdue(tache.dateEcheance!, tache.status)
							return (
								<button
									key={tache._id}
									type="button"
									className="flex w-full border-b last:border-b-0 hover:bg-muted/20 cursor-pointer text-left"
									onClick={() => router.push(`/taches/${tache._id}`)}
								>
									<div className="w-52 shrink-0 px-3 py-2 text-xs font-medium border-r truncate">
										<div className="truncate">{tache.nom}</div>
										{overdue && <div className="text-red-500 text-[10px]">En retard</div>}
									</div>
									<div className="flex flex-1 relative">
										{Array.from({ length: nbJours }).map((_, i) => (
											<div
												key={i}
												className={cn(
													"flex-1 border-r last:border-r-0 py-2",
													new Date(annee, mois, i + 1).getDay() === 0 ||
														new Date(annee, mois, i + 1).getDay() === 6
														? "bg-muted/30"
														: "",
												)}
											/>
										))}
										{/* Marqueur d'échéance */}
										<div
											className="absolute top-1 bottom-1 flex items-center justify-center"
											style={{
												left: `calc(${(dayIndex / nbJours) * 100}% + 2px)`,
												width: `calc(${(1 / nbJours) * 100}% - 4px)`,
											}}
										>
											<div
												className={cn(
													"w-full h-5 rounded border text-[9px] flex items-center justify-center font-medium truncate px-0.5",
													overdue
														? "bg-red-100 border-red-400 text-red-700"
														: (STATUS_COLORS[tache.status] ?? "bg-gray-100 border-gray-400"),
												)}
												title={tache.nom}
											>
												●
											</div>
										</div>
									</div>
								</button>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
