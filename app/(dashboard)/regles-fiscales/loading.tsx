import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
	return (
		<div className="flex h-[calc(100vh-64px)] items-center justify-center bg-[#F4F5F3]">
			<div className="space-y-4 text-center">
				<Skeleton className="mx-auto h-12 w-48" />
				<Skeleton className="mx-auto h-4 w-72" />
				<Skeleton className="mx-auto h-4 w-56" />
			</div>
		</div>
	)
}
