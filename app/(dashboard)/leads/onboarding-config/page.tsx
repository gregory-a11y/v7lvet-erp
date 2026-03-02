"use client"

import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { OnboardingTemplateList } from "@/components/leads/onboarding-template-list"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { useSeedOnboardingTemplates } from "@/lib/hooks/use-onboarding"

export default function OnboardingConfigPage() {
	const seedTemplates = useSeedOnboardingTemplates()

	const handleSeed = async () => {
		try {
			const result = await seedTemplates()
			if (result.seeded) {
				toast.success(`${result.count} templates par défaut créés`)
			} else {
				toast.info("Des templates existent déjà")
			}
		} catch (err: any) {
			toast.error(err.message ?? "Erreur")
		}
	}

	return (
		<div>
			<PageHeader
				title="Onboarding Leads"
				description="Configurez les tâches d'onboarding générées automatiquement"
				actions={
					<Button variant="outline" size="sm" className="gap-1.5" onClick={handleSeed}>
						<Sparkles className="h-3.5 w-3.5" />
						Templates par défaut
					</Button>
				}
			/>
			<div className="p-6 max-w-3xl">
				<OnboardingTemplateList />
			</div>
		</div>
	)
}
