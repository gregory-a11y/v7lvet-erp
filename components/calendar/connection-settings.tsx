"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"

export function ConnectionSettings() {
	return (
		<div className="space-y-3">
			<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Calendriers externes
			</p>
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-white">
					<div className="flex items-center gap-2.5">
						<Image
							src="/logos/google-calendar.svg"
							alt="Google Calendar"
							width={24}
							height={24}
							className="shrink-0"
						/>
						<div className="min-w-0">
							<p className="text-sm font-medium leading-tight">Google Calendar</p>
							<p className="text-[11px] text-muted-foreground">Bientôt disponible</p>
						</div>
					</div>
					<Button variant="outline" size="sm" disabled className="shrink-0 text-xs">
						Connecter
					</Button>
				</div>

				<div className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-white">
					<div className="flex items-center gap-2.5">
						<Image
							src="/logos/outlook.svg"
							alt="Microsoft Outlook"
							width={24}
							height={24}
							className="shrink-0"
						/>
						<div className="min-w-0">
							<p className="text-sm font-medium leading-tight">Microsoft Outlook</p>
							<p className="text-[11px] text-muted-foreground">Bientôt disponible</p>
						</div>
					</div>
					<Button variant="outline" size="sm" disabled className="shrink-0 text-xs">
						Connecter
					</Button>
				</div>
			</div>
		</div>
	)
}
