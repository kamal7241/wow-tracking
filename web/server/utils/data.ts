import { promises as fs } from 'fs'
import { join } from 'path'

const dataDir = join(process.cwd(), 'data')

export async function readJson<T>(fileName: string): Promise<T> {
  const filePath = join(dataDir, fileName)
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export async function writeJson<T>(fileName: string, data: T): Promise<void> {
  const filePath = join(dataDir, fileName)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function ensureId<T extends { id?: string }>(item: T): T {
  if (!item.id) {
    item.id = crypto.randomUUID()
  }
  return item
}
