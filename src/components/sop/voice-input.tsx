'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface VoiceInputProps {
  lang: 'en-US' | 'es-ES'
  onTranscript: (text: string) => void
  className?: string
}

export function VoiceInput({ lang, onTranscript, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null

  const toggle = useCallback(() => {
    if (!SpeechRecognitionAPI) return

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) {
        onTranscript(transcript)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [SpeechRecognitionAPI, isListening, lang, onTranscript])

  // Graceful degradation: don't render if unsupported
  if (!SpeechRecognitionAPI) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
        isListening
          ? 'bg-red text-white animate-pulse'
          : 'bg-brown/5 text-brown/40 hover:bg-brown/10 hover:text-brown/60',
        className
      )}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  )
}
