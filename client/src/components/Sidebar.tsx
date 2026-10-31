import type { Site } from '../types'

interface Props {
  sites: Site[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onShowSources: () => void
}

export function Sidebar({ sites, selectedId, onSelect, onShowSources }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          ॐ
        </span>
        <div>
          <h1>Ward 16 Heritage Guide</h1>
          <p>Kathmandu Metropolitan City</p>
        </div>
      </div>

      <nav aria-label="Heritage sites">
        <button className={`site-btn ${selectedId === null ? 'active' : ''}`} onClick={() => onSelect(null)}>
          <span className="site-name">All sites</span>
          <span className="site-alias">Ask about any of the six</span>
        </button>
        {sites.map((site) => (
          <button
            key={site.id}
            className={`site-btn ${selectedId === site.id ? 'active' : ''}`}
            onClick={() => onSelect(site.id)}
            aria-pressed={selectedId === site.id}
          >
            <span className="site-name">{site.name}</span>
            {site.aliases.length > 0 && <span className="site-alias">{site.aliases.slice(0, 2).join(' · ')}</span>}
          </button>
        ))}
      </nav>

      <button className="link-btn" onClick={onShowSources}>
        View research sources
      </button>
    </aside>
  )
}
