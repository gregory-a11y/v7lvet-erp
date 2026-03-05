import { Badge } from "@/components/ui/badge"

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
	basse: { label: "Basse", className: "bg-gray-100 text-gray-700 border-gray-200" },
	normale: { label: "Normale", className: "bg-blue-50 text-blue-700 border-blue-200" },
	haute: { label: "Haute", className: "bg-orange-50 text-orange-700 border-orange-200" },
	urgente: { label: "Urgente", className: "bg-red-50 text-red-700 border-red-200" },
}

export function PriorityBadge({ priorite }: { priorite: string }) {
	const config = PRIORITY_CONFIG[priorite] ?? PRIORITY_CONFIG.normale
	return (
		<Badge variant="outline" className={`text-xs ${config.className}`}>
			{config.label}
		</Badge>
	)
}
