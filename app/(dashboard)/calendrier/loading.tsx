import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-48" />
				<div className="flex gap-2">
					<Skeleton className="h-9 w-24" />
					<Skeleton className="h-9 w-36" />
				</div>
			</div>
			<div className="flex gap-6">
				<div className="flex-1 space-y-2">
					<div className="flex gap-2 mb-4">
						<Skeleton className="h-8 w-20" />
						<Skeleton className="h-8 w-20" />
						<Skeleton className="h-8 w-20" />
					</div>
					<div className="grid grid-cols-7 gap-px">
						{Array.from({ length: 7 }).map((_, i) => (
							<Skeleton key={`head-${i}`} className="h-8" />
						))}
						{Array.from({ length: 35 }).map((_, i) => (
							<Skeleton key={`cell-${i}`} className="h-24" />
						))}
					</div>
				</div>
				<div className="w-56 space-y-3 hidden lg:block">
					<Skeleton className="h-5 w-20" />
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={`member-${i}`} className="h-6 w-full" />
					))}
				</div>
			</div>
		</div>
	)
}
