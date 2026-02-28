"use client"

import { animate, useMotionValue, useTransform } from "framer-motion"
import { useEffect } from "react"

export function useAnimatedCounter(value: number, duration = 0.8) {
	const motionValue = useMotionValue(0)
	const rounded = useTransform(motionValue, (latest) => Math.round(latest).toString())

	useEffect(() => {
		const controls = animate(motionValue, value, {
			duration,
			ease: "easeOut",
		})
		return controls.stop
	}, [motionValue, value, duration])

	return rounded
}
