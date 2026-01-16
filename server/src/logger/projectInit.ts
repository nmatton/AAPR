import { logEvent } from './eventLogger'
import { promises as fs } from 'fs'
import path from 'path'

const sentinelPath = path.resolve(__dirname, '../../logs/.initialized')

export const logProjectInitialized = async (): Promise<void> => {
  // Only log initialization once (sentinel check)
  try {
    await fs.access(sentinelPath)
    // Sentinel exists, project already initialized
    return
  } catch {
    // Sentinel doesn't exist, first initialization
    await logEvent({
      action: 'project.initialized',
      template: 'minimal-vite-express',
      timestamp: new Date().toISOString(),
    })
    
    // Create sentinel file to prevent duplicate logging
    await fs.writeFile(sentinelPath, new Date().toISOString())
  }
}
