import type { Transition, Variants } from "framer-motion"

// ─── Spring Presets ─────────────────────────────────────────────
export const springSmooth: Transition = {
	type: "spring",
	stiffness: 300,
	damping: 30,
}

export const springSnappy: Transition = {
	type: "spring",
	stiffness: 400,
	damping: 28,
}

export const springGentle: Transition = {
	type: "spring",
	stiffness: 200,
	damping: 24,
}

// ─── Stagger Containers ────────────────────────────────────────
export const staggerContainer: Variants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05,
		},
	},
}

export const staggerContainerSlow: Variants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.08,
			delayChildren: 0.1,
		},
	},
}

// ─── Children Variants ─────────────────────────────────────────
export const fadeInUp: Variants = {
	hidden: { opacity: 0, y: 10 },
	show: {
		opacity: 1,
		y: 0,
		transition: springSmooth,
	},
}

export const fadeIn: Variants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { duration: 0.25 },
	},
}

export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.95 },
	show: {
		opacity: 1,
		scale: 1,
		transition: springSmooth,
	},
}

// ─── Page Transitions ──────────────────────────────────────────
export const pageTransition: Variants = {
	initial: { opacity: 0, y: 8 },
	animate: {
		opacity: 1,
		y: 0,
		transition: {
			...springSmooth,
			staggerChildren: 0.06,
		},
	},
	exit: {
		opacity: 0,
		y: -4,
		transition: { duration: 0.15 },
	},
}

// ─── Sidebar Variants ──────────────────────────────────────────
export const sidebarNavItem: Variants = {
	hidden: { opacity: 0, x: -12 },
	show: {
		opacity: 1,
		x: 0,
		transition: springSmooth,
	},
}

export const sidebarLabelVariants: Variants = {
	expanded: {
		opacity: 1,
		width: "auto",
		transition: { duration: 0.2, delay: 0.1 },
	},
	collapsed: {
		opacity: 0,
		width: 0,
		transition: { duration: 0.1 },
	},
}

// ─── Tooltip ───────────────────────────────────────────────────
export const tooltipVariants: Variants = {
	hidden: {
		opacity: 0,
		x: -4,
		scale: 0.96,
	},
	visible: {
		opacity: 1,
		x: 0,
		scale: 1,
		transition: {
			type: "spring",
			stiffness: 400,
			damping: 25,
		},
	},
}

// ─── Skeleton Shimmer (use as className) ───────────────────────
// Apply this as: className="animate-shimmer bg-gradient-to-r from-v7-perle via-white/60 to-v7-perle bg-[length:200%_100%]"
// The keyframe is defined in globals.css

// ─── Dashboard Variants ───────────────────────────────────────
export const dashboardStagger: Variants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.06,
			delayChildren: 0.15,
		},
	},
}

export const cardReveal: Variants = {
	hidden: { opacity: 0, scale: 0.97 },
	show: {
		opacity: 1,
		scale: 1,
		transition: springSnappy,
	},
}

export const slideInFromBottom: Variants = {
	hidden: { opacity: 0, y: 24 },
	show: {
		opacity: 1,
		y: 0,
		transition: springSmooth,
	},
}

// ─── Loading Skeleton Variants ─────────────────────────────────
export const skeletonContainer: Variants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.08,
		},
	},
}

export const skeletonItem: Variants = {
	hidden: { opacity: 0, y: 6 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3 },
	},
}
