"use client"

import { motion } from "framer-motion"
import { skeletonContainer, skeletonItem } from "@/lib/animations"
import { cn } from "@/lib/utils"

function Shimmer({ className }: { className?: string }) {
	return (
		<motion.div
			variants={skeletonItem}
			className={cn(
				"rounded-lg bg-gradient-to-r from-v7-perle via-white/60 to-v7-perle bg-[length:200%_100%] animate-shimmer",
				className,
			)}
		/>
	)
}

export function DashboardSkeleton() {
	return (
		<motion.div
			variants={skeletonContainer}
			initial="hidden"
			animate="show"
			className="p-6 md:p-8 space-y-8"
		>
			{/* Header */}
			<div className="space-y-2">
				<Shimmer className="h-8 w-64" />
				<Shimmer className="h-4 w-40" />
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Shimmer key={i} className="h-28" />
				))}
			</div>

			{/* Stats row */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Shimmer key={i} className="h-20" />
				))}
			</div>

			{/* Table */}
			<div className="space-y-3">
				<Shimmer className="h-10 w-full" />
				{Array.from({ length: 6 }).map((_, i) => (
					<Shimmer key={i} className="h-12 w-full" />
				))}
			</div>
		</motion.div>
	)
}

export function TablePageSkeleton({ title = true }: { title?: boolean }) {
	return (
		<motion.div
			variants={skeletonContainer}
			initial="hidden"
			animate="show"
			className="p-6 md:p-8 space-y-6"
		>
			{/* Page header */}
			{title && (
				<div className="space-y-2">
					<Shimmer className="h-8 w-48" />
					<Shimmer className="h-4 w-72" />
				</div>
			)}

			{/* Toolbar (search + filters + button) */}
			<div className="flex items-center gap-3">
				<Shimmer className="h-10 w-64" />
				<Shimmer className="h-10 w-36" />
				<div className="flex-1" />
				<Shimmer className="h-10 w-36" />
			</div>

			{/* Table */}
			<div className="space-y-2">
				<Shimmer className="h-11 w-full" />
				{Array.from({ length: 8 }).map((_, i) => (
					<Shimmer key={i} className="h-14 w-full" />
				))}
			</div>
		</motion.div>
	)
}

export function SettingsSkeleton() {
	return (
		<motion.div
			variants={skeletonContainer}
			initial="hidden"
			animate="show"
			className="p-6 md:p-8 space-y-6"
		>
			{/* Header */}
			<div className="space-y-2">
				<Shimmer className="h-8 w-40" />
				<Shimmer className="h-4 w-60" />
			</div>

			{/* Tabs */}
			<Shimmer className="h-10 w-80" />

			{/* Content cards */}
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<Shimmer key={i} className="h-32 w-full" />
				))}
			</div>
		</motion.div>
	)
}
