"use client"

interface GanttTodayLineProps {
	position: number
}

export function GanttTodayLine({ position }: GanttTodayLineProps) {
	if (position < 0 || position > 1) return null

	return (
		<div
			className="absolute top-0 bottom-0 z-20 pointer-events-none"
			style={{ left: `${position * 100}%` }}
		>
			<div className="relative h-full">
				{/* Circle at top */}
				<div className="absolute -top-0.5 -left-[5px] h-[10px] w-[10px] rounded-full bg-[#063238]" />
				{/* Vertical line */}
				<div className="absolute top-0 bottom-0 left-0 w-[2px] -translate-x-1/2 bg-[#063238]" />
			</div>
		</div>
	)
}
