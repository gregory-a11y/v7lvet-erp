import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
	return (
		<div className="flex h-[calc(100vh-3.5rem)]">
			{/* Conversation list skeleton */}
			<div className="w-80 border-r p-3 space-y-3 hidden lg:block">
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-7 w-7 rounded-md" />
				</div>
				<Skeleton className="h-8 w-full rounded-md" />
				<Skeleton className="h-7 w-full rounded-md" />
				<div className="space-y-2 pt-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex items-start gap-3 p-2">
							<Skeleton className="h-8 w-8 rounded-full shrink-0" />
							<div className="flex-1 space-y-1.5">
								<Skeleton className="h-3.5 w-28" />
								<Skeleton className="h-3 w-40" />
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Chat panel skeleton */}
			<div className="flex-1 flex flex-col">
				<div className="flex items-center gap-3 px-4 py-3 border-b">
					<Skeleton className="h-5 w-32" />
					<div className="flex-1" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
				<div className="flex-1 p-4 space-y-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "justify-end"}`}>
							{i % 2 === 0 && <Skeleton className="h-6 w-6 rounded-full shrink-0" />}
							<Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-36"}`} />
						</div>
					))}
				</div>
				<div className="border-t px-4 py-3">
					<Skeleton className="h-10 w-full rounded-xl" />
				</div>
			</div>
		</div>
	)
}
