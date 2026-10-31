import type { ChatEvent } from '../types'

/** Incrementally parses `data: {...}\n\n` server-sent events from arbitrary text chunks. */
export function createSseParser() {
  let buffer = ''
  return (chunk: string): ChatEvent[] => {
    buffer += chunk
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    return frames
      .map((frame) => frame.split('\n').find((line) => line.startsWith('data: ')))
      .filter((line): line is string => Boolean(line))
      .map((line) => JSON.parse(line.slice(6)) as ChatEvent)
  }
}
