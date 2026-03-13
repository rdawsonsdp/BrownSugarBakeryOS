'use client'
import { useRef, useState } from 'react'
import { Camera, X, Check } from 'lucide-react'
import { Button } from './button'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { cn } from '@/lib/utils/cn'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onCancel?: () => void
  className?: string
}

export function CameraCapture({ onCapture, onCancel, className }: CameraCaptureProps) {
  const { locale } = useLocaleStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const handleConfirm = () => {
    if (file) onCapture(file)
  }

  const handleRetake = () => {
    setPreview(null)
    setFile(null)
    inputRef.current?.click()
  }

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-brown/20 text-brown/50 hover:border-brown/40 hover:text-brown/70 transition-colors"
        >
          <Camera className="w-5 h-5" />
          <span className="text-sm font-medium">{locale === 'es' ? 'Tomar Foto' : 'Take Photo'}</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden">
            <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleRetake} className="flex-1 gap-1">
              <Camera className="w-4 h-4" /> {locale === 'es' ? 'Repetir' : 'Retake'}
            </Button>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="flex-1 gap-1">
                <X className="w-4 h-4" /> {locale === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleConfirm} className="flex-1 gap-1">
              <Check className="w-4 h-4" /> {locale === 'es' ? 'Usar Foto' : 'Use Photo'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
