export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface AIGeneratedSOP {
  name_en: string
  name_es: string
  description_en: string
  description_es: string
  category: string
  is_critical: boolean
  days_of_week: number[]
  steps: {
    title_en: string
    title_es: string
    description_en: string
    description_es: string
    requires_photo: boolean
    estimated_minutes: number | null
  }[]
}

export interface AIChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  zone: { name_en: string; name_es: string; slug: string }
  locale: 'en' | 'es'
  generate: boolean
}

export interface AIChatResponse {
  message: string
  sop?: AIGeneratedSOP
}
