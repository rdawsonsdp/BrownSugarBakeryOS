'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Send, Volume2, VolumeX, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { VoiceInput } from './voice-input'
import { useLocaleStore } from '@/lib/stores/locale-store'
import type { ChatMessage, AIGeneratedSOP, AIChatResponse } from '@/lib/types/ai-chat.types'

interface AIChatProps {
  zone: { name_en: string; name_es: string; slug: string }
  onGenerated: (sop: AIGeneratedSOP) => void
  onCancel: () => void
}

let messageIdCounter = 0
function nextId() {
  return `msg-${++messageIdCounter}`
}

export function AIChat({ zone, onGenerated, onCancel }: AIChatProps) {
  const t = useTranslations('sop.editor')
  const { locale } = useLocaleStore()

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'assistant', content: t('aiGreeting') },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ttsEnabled, setTtsEnabled] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = locale === 'es' ? 'es-ES' : 'en-US'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }, [ttsEnabled, locale])

  const sendMessage = useCallback(async (generate: boolean = false) => {
    const trimmed = input.trim()
    if (!trimmed && !generate) return

    setError(null)

    // Add user message (unless it's a generate-only call with no new text)
    const updatedMessages = [...messages]
    if (trimmed) {
      const userMsg: ChatMessage = { id: nextId(), role: 'user', content: trimmed }
      updatedMessages.push(userMsg)
      setMessages(updatedMessages)
      setInput('')
    }

    if (generate) {
      setIsGenerating(true)
    } else {
      setIsLoading(true)
    }

    try {
      const apiMessages = updatedMessages
        .filter((m) => m.id !== messages[0]?.id || m.role !== 'assistant') // skip synthetic greeting
        .map((m) => ({ role: m.role, content: m.content }))

      // Ensure we have messages to send - include greeting context if needed
      const messagesToSend = apiMessages.length > 0 ? apiMessages : updatedMessages.map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/sops/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          zone: { name_en: zone.name_en, name_es: zone.name_es, slug: zone.slug },
          locale,
          generate,
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data: AIChatResponse = await res.json()

      if (generate && data.sop) {
        onGenerated(data.sop)
        return
      }

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: data.message,
      }
      setMessages((prev) => [...prev, assistantMsg])
      speak(data.message)
    } catch {
      setError(t('aiError'))
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
    }
  }, [input, messages, zone, locale, onGenerated, speak, t])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(false)
    }
  }

  const handleVoiceTranscript = (text: string) => {
    setInput((prev) => prev ? `${prev} ${text}` : text)
  }

  // Show Generate button after 2+ user messages (4+ total messages including greeting)
  const userMessageCount = messages.filter((m) => m.role === 'user').length
  const canGenerate = userMessageCount >= 2

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brown/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold" />
          <h3 className="font-semibold text-brown text-sm">{t('aiTitle')}</h3>
        </div>
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            ttsEnabled ? 'bg-gold/10 text-gold' : 'bg-brown/5 text-brown/30'
          )}
          aria-label={ttsEnabled ? 'Disable TTS' : 'Enable TTS'}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[60vh]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-brown text-cream rounded-br-md'
                  : 'bg-brown/5 text-brown rounded-bl-md'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-brown/5 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brown/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-brown/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-brown/30 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red/60 hover:text-red font-medium ml-2"
          >
            {t('aiDismiss')}
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-brown/10 px-4 py-3 space-y-3">
        <div className="flex gap-2 items-center">
          <VoiceInput
            lang={locale === 'es' ? 'es-ES' : 'en-US'}
            onTranscript={handleVoiceTranscript}
          />
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('aiPlaceholder')}
            className="flex-1"
            disabled={isLoading || isGenerating}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => sendMessage(false)}
            disabled={!input.trim() || isLoading || isGenerating}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Generate button */}
        {canGenerate && (
          <Button
            variant="secondary"
            onClick={() => sendMessage(true)}
            disabled={isLoading || isGenerating}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('aiGenerating')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('aiGenerate')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
