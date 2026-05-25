export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ChatModelSettings {
  apiKey: string
  baseUrl: string
  model: string
}
