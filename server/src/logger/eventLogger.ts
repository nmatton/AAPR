import { promises as fs } from 'fs'
import path from 'path'

export type EventLogEntry = {
  action: string
  template: string
  timestamp: string
}

const logFilePath = path.resolve(__dirname, '../../logs/project-events.json')

const readEvents = async (): Promise<EventLogEntry[]> => {
  try {
    const content = await fs.readFile(logFilePath, 'utf-8')
    return JSON.parse(content) as EventLogEntry[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export const logEvent = async (entry: EventLogEntry): Promise<void> => {
  await fs.mkdir(path.dirname(logFilePath), { recursive: true })
  const events = await readEvents()
  const updated = [...events, entry]
  await fs.writeFile(logFilePath, JSON.stringify(updated, null, 2))
}
