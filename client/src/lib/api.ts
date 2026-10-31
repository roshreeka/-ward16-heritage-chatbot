import type { ChatEvent, Reference, Role, Site } from '../types'
import { createSseParser } from './sse'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Request to ${path} failed (${res.status})`)
  return res.json() as Promise<T>
}

export const fetchSites = () => getJson<{ sites: Site[] }>('/api/sites').then((r) => r.sites)
export const fetchReferences = () => getJson<{ references: Reference[] }>('/api/references').then((r) => r.references)

export interface ChatRequest {
  message: string
  siteId: string | null
  history: { role: Role; text: string }[]
}

export async function* streamChat(body: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatEvent> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? `Chat request failed (${res.status})`)
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  const parse = createSseParser()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    yield* parse(value)
  }
}
