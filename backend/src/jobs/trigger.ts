/**
 * GitHub Actions job trigger script.
 * Run via: node dist/jobs/trigger.js
 * Called by the weekly GitHub Actions cron workflow.
 */

import { runWeeklyUpdate } from './weekly-update.job.js'
import { logger }          from '../utils/logger.js'

async function main() {
  logger.info('PlayFooty rankings: manual update triggered by GitHub Actions')

  try {
    const result = await runWeeklyUpdate()

    logger.info('PlayFooty rankings: job complete', result)

    if (result.status === 'FAILED') {
      process.exit(1)
    }
  } catch (err) {
    logger.error('PlayFooty rankings: job threw unhandled error', {
      error: err instanceof Error ? err.message : String(err),
    })
    process.exit(1)
  }
}

main()
