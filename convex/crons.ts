import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Chaque jour à 7h00 UTC — vérifie les échéances de tâches et génère les notifications
crons.daily("check-echeances", { hourUTC: 7, minuteUTC: 0 }, internal.notifications.checkEcheances)

// Toutes les minutes — nettoie les typing indicators expirés
crons.interval("cleanup-typing", { minutes: 1 }, internal.typingIndicators.cleanupExpired)

// Chaque jour à 2h00 UTC — archive les tâches terminées depuis +1 mois
crons.daily("archive-old-todos", { hourUTC: 2, minuteUTC: 0 }, internal.todos.archiveOldCompleted)

// Chaque jour à 6h30 UTC — exécute les automatisations de tâches
crons.daily(
	"execute-task-automations",
	{ hourUTC: 6, minuteUTC: 30 },
	internal.taskAutomations.executeAutomations,
)

export default crons
