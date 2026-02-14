import { readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { truncateAll, closeDb } from './helpers/db'

const FIXTURE_DIR = join(process.cwd(), 'e2e/.fixtures')

export default async function globalTeardown() {
  // Kill Anvil if we spawned it
  const pidFile = join(FIXTURE_DIR, 'anvil.pid')
  if (existsSync(pidFile)) {
    try {
      const pid = Number(readFileSync(pidFile, 'utf-8'))
      process.kill(-pid) // kill process group
    } catch {
      // Already dead
    }
  }

  // Clean test data from DB
  try {
    await truncateAll()
    await closeDb()
  } catch {
    // DB may already be clean
  }

  // Clean up fixture files
  try {
    rmSync(FIXTURE_DIR, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
}
