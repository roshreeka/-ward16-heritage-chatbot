import { describe, expect, it } from 'vitest'
import { createSseParser } from './sse'
import { linkCitations } from './citations'

describe('createSseParser', () => {
  it('handles events split across chunks', () => {
    const parse = createSseParser()
    expect(parse('data: {"text":"Hel')).toEqual([])
    expect(parse('lo"}\n\ndata: {"text":"!"}\n\ndata: {"done"')).toEqual([{ text: 'Hello' }, { text: '!' }])
    expect(parse(':true}\n\n')).toEqual([{ done: true }])
  })
})

describe('linkCitations', () => {
  const refs = [1, 2, 3, 5].map((n) => ({ number: n, text: `Ref ${n}`, url: `https://example.com/${n}` }))

  it('links single, list and range citations', () => {
    expect(linkCitations('A [2].', refs)).toBe('A [\\[2\\]](https://example.com/2 "Ref 2").')
    expect(linkCitations('B [1–3]', refs)).toContain('https://example.com/3')
    expect(linkCitations('C [2,5]', refs)).toContain('https://example.com/5')
  })

  it('leaves unknown citations and existing links alone', () => {
    expect(linkCitations('D [9]', refs)).toBe('D [9]')
    expect(linkCitations('[1](https://x.y)', refs)).toBe('[1](https://x.y)')
  })
})
