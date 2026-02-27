import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
	return (
		<div className="p-6 space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-72" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="space-y-3">
						<Skeleton className="aspect-video w-full rounded-lg" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				))}
			</div>
		</div>
	)
}
