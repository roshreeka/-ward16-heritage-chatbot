import Markdown from 'react-markdown'
import { linkCitations } from '../lib/citations'
import type { ChatMessage, Reference } from '../types'

interface Props {
  message: ChatMessage
  references: Reference[]
  pending: boolean
}

export function MessageBubble({ message, references, pending }: Props) {
  const isUser = message.role === 'user'
  return (
    <div className={`message ${isUser ? 'user' : 'model'}`}>
      <div className="bubble">
        {isUser ? (
          <p>{message.text}</p>
        ) : message.text ? (
          <Markdown
            components={{
              a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
            }}
          >
            {linkCitations(message.text, references)}
          </Markdown>
        ) : pending ? (
          <span className="typing" aria-label="Generating answer">
            <span />
            <span />
            <span />
          </span>
        ) : null}
        {message.error && <p className="error">{message.error}</p>}
      </div>
    </div>
  )
}
