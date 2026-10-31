import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { MessageBubble } from './components/MessageBubble'
import { Sidebar } from './components/Sidebar'
import { SourcesPanel } from './components/SourcesPanel'
import { fetchReferences, fetchSites, streamChat } from './lib/api'
import type { ChatMessage, Reference, Site } from './types'

const STORAGE_KEY = 'ward16-chat'
const GENERAL_SUGGESTIONS = [
  'Give me an overview of the six heritage sites in Ward 16.',
  'Which sites are part of the Baisdhara Mela?',
  'वडा १६ का सम्पदाहरूको बारेमा छोटकरीमा बताउनुहोस्।',
]

const newId = () => crypto.randomUUID()

function loadMessages(): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ChatMessage[]
  } catch {
    return []
  }
}

export default function App() {
  const [sites, setSites] = useState<Site[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchSites(), fetchReferences()])
      .then(([s, r]) => {
        setSites(s)
        setReferences(r)
      })
      .catch(() => setLoadError('Could not reach the server. Is the backend running?'))
  }, [])

  useEffect(() => {
    if (!streaming) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  const site = useMemo(() => sites.find((s) => s.id === selectedId) ?? null, [sites, selectedId])
  const suggestions = site?.suggestions ?? GENERAL_SUGGESTIONS

  async function send(text: string) {
    const message = text.trim()
    if (!message || streaming) return

    const history = messages.filter((m) => !m.error && m.text).map(({ role, text }) => ({ role, text }))
    const replyId = newId()
    setMessages((prev) => [...prev, { id: newId(), role: 'user', text: message }, { id: replyId, role: 'model', text: '' }])
    setInput('')
    setStreaming(true)

    const update = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === replyId ? fn(m) : m)))

    const controller = new AbortController()
    abortRef.current = controller
    try {
      for await (const event of streamChat({ message, siteId: selectedId, history }, controller.signal)) {
        if (event.text) update((m) => ({ ...m, text: m.text + event.text }))
        if (event.error) update((m) => ({ ...m, error: event.error }))
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        update((m) => ({ ...m, error: err instanceof Error ? err.message : 'Something went wrong.' }))
      }
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function clearChat() {
    abortRef.current?.abort()
    setMessages([])
  }

  return (
    <div className="app">
      <Sidebar
        sites={sites}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onShowSources={() => setShowSources(true)}
      />

      <main className="chat">
        <header className="chat-header">
          <div>
            <h2>{site ? site.heading : 'All heritage sites'}</h2>
            <p>{site ? 'Questions will focus on this site.' : 'Ask about any of the six Ward 16 heritage sites.'}</p>
          </div>
          <button className="ghost-btn" onClick={clearChat} disabled={messages.length === 0}>
            Clear chat
          </button>
        </header>

        <div className="messages" aria-live="polite">
          {loadError && <p className="error banner">{loadError}</p>}
          {messages.length === 0 && (
            <div className="welcome">
              <h3>Namaste! 🙏</h3>
              <p>
                I answer questions about Balaju 22 Dhara, Pyatho Ajima, Mhepi Ajima, Siddhi Ganesh, Nanak Math and
                Koncha Dyo using the Ward 16 heritage research report. You can ask in English or Nepali.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              references={references}
              pending={streaming && i === messages.length - 1}
            />
          ))}
          <div ref={endRef} />
        </div>

        <div className="composer">
          <div className="suggestions">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => void send(s)} disabled={streaming}>
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={site ? `Ask about ${site.name}…` : 'Ask about Ward 16 heritage…'}
              maxLength={2000}
              aria-label="Your question"
            />
            <button type="submit" className="send-btn" disabled={streaming || !input.trim()}>
              {streaming ? '…' : 'Send'}
            </button>
          </form>
          <p className="disclaimer">AI answers are based on a desk research report and may contain mistakes.</p>
        </div>
      </main>

      {showSources && <SourcesPanel references={references} site={site} onClose={() => setShowSources(false)} />}
    </div>
  )
}
