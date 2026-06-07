import { useStorage } from '#imports'

// In-memory cache for writes (Vercel has a read-only filesystem)
const memoryStore: Record<string, any> = {}

export async function readJson<T>(fileName: string): Promise<T> {
  // Return from memory if previously written
  if (memoryStore[fileName] !== undefined) {
    return memoryStore[fileName] as T
  }

  try {
    const storage = useStorage('assets:data')
    const key = fileName.replace('.json', '')
    const data = await storage.getItem<T>(`${key}.json`)
    if (data) return data
  } catch {
    // fallback below
  }

  return [] as unknown as T
}

export async function writeJson<T>(fileName: string, data: T): Promise<void> {
  // Store in memory (persists for this serverless instance lifetime)
  memoryStore[fileName] = data
}

export function ensureId<T extends { id?: string }>(item: T): T {
  if (!item.id) {
    item.id = crypto.randomUUID()
  }
  return item
}
