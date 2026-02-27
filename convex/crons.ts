import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Chaque jour à 7h00 UTC — vérifie les échéances de tâches et génère les notifications
crons.daily("check-echeances", { hourUTC: 7, minuteUTC: 0 }, internal.notifications.checkEcheances)

// Toutes les minutes — nettoie les typing indicators expirés
crons.interval("cleanup-typing", { minutes: 1 }, internal.typingIndicators.cleanupExpired)

export default crons
