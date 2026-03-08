'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface PhotoInputProps {
  lang: 'eng' | 'spa'
  onTextExtracted: (text: string, fieldKey: string) => void
  onClose: () => void
  fieldOptions: { key: string; label: string }[]
}

export function PhotoInput({ lang, onTextExtracted, onClose, fieldOptions }: PhotoInputProps) {
  const t = useTranslations('sop.editor')
  const [image, setImage] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedField, setSelectedField] = useState('')
  const [step, setStep] = useState<'capture' | 'preview' | 'assign'>('capture')

  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setImage(e.target?.result as string)
      setStep('preview')
    }
    reader.readAsDataURL(file)
  }

  const handleExtract = async () => {
    if (!image) return
    setIsExtracting(true)
    setProgress(0)

    try {
      const Tesseract = await import('tesseract.js')
      const result = await Tesseract.recognize(image, lang, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      const text = result.data.text.trim()
      if (text) {
        setExtractedText(text)
        setStep('assign')
      } else {
        setExtractedText('')
        setStep('assign')
      }
    } catch {
      setExtractedText('')
      setStep('assign')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleUseText = () => {
    if (extractedText && selectedField) {
      onTextExtracted(extractedText, selectedField)
      onClose()
    }
  }

  return (
    <div className="space-y-4">
      {/* Capture step */}
      {step === 'capture' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => cameraRef.current?.click()}
              className="gap-2"
            >
              <Camera className="w-4 h-4" /> {t('photoCapture')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => uploadRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" /> {t('photoUpload')}
            </Button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && image && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-brown/10">
            <img src={image} alt={t('photoPreview')} className="w-full max-h-64 object-contain bg-brown/5" />
          </div>
          {isExtracting ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-brown/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('photoExtracting')}
              </div>
              <div className="w-full bg-brown/10 rounded-full h-2">
                <div
                  className="bg-gold h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { setImage(null); setStep('capture') }}>
                {t('cancel' as 'photoCapture')}
              </Button>
              <Button variant="primary" onClick={handleExtract} className="flex-1 gap-2">
                {t('photoExtract')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Assign step */}
      {step === 'assign' && (
        <div className="space-y-4">
          {extractedText ? (
            <>
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-brown/20 bg-white px-4 py-3 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              />
              <div>
                <label className="text-xs font-medium text-brown/60 mb-2 block">{t('photoSelectField')}</label>
                <div className="flex flex-wrap gap-2">
                  {fieldOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedField(opt.key)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                        selectedField === opt.key
                          ? 'bg-brown text-cream border-brown'
                          : 'bg-white text-brown/60 border-brown/20 hover:border-brown/40'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleUseText}
                disabled={!selectedField}
                className="w-full"
              >
                {t('photoUseText')}
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-brown/40">{t('photoNoText')}</p>
              <Button variant="ghost" onClick={() => { setImage(null); setStep('capture') }} className="mt-2">
                {t('retry' as 'photoCapture')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
