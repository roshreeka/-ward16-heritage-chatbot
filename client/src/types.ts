export interface Photo {
  label: string
  url: string | null
  credit: string
}

export interface Site {
  id: string
  name: string
  aliases: string[]
  heading: string
  suggestions: string[]
  photos: Photo[]
}

export interface Reference {
  number: number
  text: string
  url: string | null
}

export type Role = 'user' | 'model'

export interface ChatMessage {
  id: string
  role: Role
  text: string
  error?: string
}

export interface ChatEvent {
  text?: string
  done?: boolean
  error?: string
}
