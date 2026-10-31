import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const sites = [
  { id: '22-dhara', name: 'Balaju 22 Dhara', aliases: ['Baisdhara'], heading: 'Balaju 22 Dhara (Baisdhara)', suggestions: ['Who built it?'], photos: [] },
]
const references = [{ number: 1, text: 'Republica', url: 'https://example.com/1' }]

function sseResponse(events: object[]) {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/sites') return Response.json({ sites })
        if (url === '/api/references') return Response.json({ references })
        return sseResponse([{ text: 'Jaya Prakash ' }, { text: 'Malla [1].' }, { done: true }])
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lets the user pick a site and streams an answer with linked citations', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Balaju 22 Dhara/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Who built it?' }))

    expect(await screen.findByText(/Jaya Prakash Malla/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '[1]' })).toHaveAttribute('href', 'https://example.com/1')

    const chatCall = vi.mocked(fetch).mock.calls.find(([u]) => u === '/api/chat')!
    expect(JSON.parse(chatCall[1]!.body as string)).toMatchObject({ message: 'Who built it?', siteId: '22-dhara' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument())
  })
})
