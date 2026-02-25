import type { ReactNode } from "react"

interface PageHeaderProps {
	title: string
	description?: string
	actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<div className="flex items-start justify-between border-b bg-white px-6 py-5">
			<div>
				<h1 className="text-lg tracking-widest font-heading text-foreground">{title}</h1>
				<div className="mt-1 h-0.5 w-8 bg-primary rounded-full" />
				{description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
			</div>
			{actions && <div className="flex items-center gap-2">{actions}</div>}
		</div>
	)
}
