import { syncStoredGoalKickers } from '../football/goal-kickers.js'
import { logger } from '../utils/logger.js'

syncStoredGoalKickers()
  .then(result => {
    logger.info('GoalKickersSync complete', result)
    console.log(JSON.stringify(result, null, 2))
  })
  .catch(err => {
    logger.error('GoalKickersSync failed', { error: err instanceof Error ? err.message : String(err) })
    process.exitCode = 1
  })
