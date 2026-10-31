import type { Reference } from '../types'

const CITATION = /\[(\d+(?:\s*[–,-]\s*\d+)*)\](?!\()/g

function expand(spec: string): number[] {
  return spec.split(',').flatMap((part) => {
    const [start, end] = part.split(/[–-]/).map((n) => Number(n.trim()))
    if (!end || end < start || end - start > 20) return [start]
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  })
}

/** Turns report citations like [4], [2,5] or [1–3] into Markdown links to their sources. */
export function linkCitations(markdown: string, references: Reference[]): string {
  const byNumber = new Map(references.map((r) => [r.number, r]))
  return markdown.replace(CITATION, (match, spec: string) => {
    const numbers = expand(spec)
    if (!numbers.every((n) => byNumber.get(n)?.url)) return match
    return numbers.map((n) => `[\\[${n}\\]](${byNumber.get(n)!.url} "${byNumber.get(n)!.text.replace(/"/g, "'")}")`).join('')
  })
}
