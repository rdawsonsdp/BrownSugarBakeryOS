'use client'

import { useState, useEffect } from 'react'
// @ts-expect-error -- react-dom types not installed separately in Next.js
import { createPortal } from 'react-dom'
import { Printer, Check } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import type { SOPWithSteps } from '@/lib/types/database.types'

// ─── Types ───────────────────────────────────────────────

interface RoleGroup {
  roleLabel: string
  staffId: string | null
  sops: SOPWithSteps[]
}

// ─── Types ───────────────────────────────────────────────

export type PrintSize = 'letter' | 'index'

// ─── Print Select Dialog ─────────────────────────────────

interface PrintSelectDialogProps {
  open: boolean
  onClose: () => void
  onPrint: (selectedKeys: string[], size: PrintSize) => void
  roleGroups: RoleGroup[]
}

export function PrintSelectDialog({ open, onClose, onPrint, roleGroups }: PrintSelectDialogProps) {
  const allKeys = roleGroups.map((g) => g.staffId || '__unassigned__')
  const [selected, setSelected] = useState<Set<string>>(new Set(allKeys))
  const [size, setSize] = useState<PrintSize>('letter')

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) { setSelected(new Set(allKeys)); setSize('letter') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const isAllSelected = selected.size === allKeys.length && allKeys.length > 0

  const toggleAll = () => {
    if (isAllSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allKeys))
    }
  }

  const toggleKey = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Print Task Sheets</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <p className="text-sm text-brown/50 mb-4">Select which task sheets to print. Each person gets their own page.</p>

        {/* All toggle */}
        <button
          onClick={toggleAll}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border-2 mb-3 transition-all text-left',
            isAllSelected
              ? 'bg-brown border-brown text-cream'
              : 'bg-white border-brown/10 text-brown hover:border-brown/30'
          )}
        >
          <div className={cn(
            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors',
            isAllSelected ? 'bg-cream border-cream' : 'border-brown/20'
          )}>
            {isAllSelected && <Check className="w-3.5 h-3.5 text-brown" />}
          </div>
          <span className="text-sm font-bold">Print All</span>
          <span className="text-xs opacity-60 ml-auto">{allKeys.length} sheets</span>
        </button>

        {/* Individual role/staff buttons */}
        <div className="space-y-2">
          {roleGroups.map((group) => {
            const key = group.staffId || '__unassigned__'
            const isSelected = selected.has(key)

            return (
              <button
                key={key}
                onClick={() => toggleKey(key)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                  isSelected
                    ? 'bg-brown/5 border-brown/30'
                    : 'bg-white border-brown/10 hover:border-brown/20'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors',
                  isSelected ? 'bg-brown border-brown' : 'border-brown/20'
                )}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cream" />}
                </div>
                <span className="text-sm font-semibold text-brown">{group.roleLabel}</span>
                <span className="text-[11px] text-brown/40 ml-auto">
                  {group.sops.length} {group.sops.length === 1 ? 'task' : 'tasks'}
                </span>
              </button>
            )
          })}
        </div>
        {/* Page size picker */}
        <div className="mt-4 pt-4 border-t border-brown/10">
          <p className="text-xs font-medium text-brown/60 mb-2">Paper Size</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSize('letter')}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                size === 'letter'
                  ? 'bg-brown/5 border-brown/30'
                  : 'bg-white border-brown/10 hover:border-brown/20'
              )}
            >
              <div className={cn(
                'w-6 h-8 border-2 rounded-sm',
                size === 'letter' ? 'border-brown' : 'border-brown/20'
              )} />
              <span className="text-xs font-semibold text-brown">8.5 x 11</span>
              <span className="text-[10px] text-brown/40">Full Page</span>
            </button>
            <button
              onClick={() => setSize('index')}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                size === 'index'
                  ? 'bg-brown/5 border-brown/30'
                  : 'bg-white border-brown/10 hover:border-brown/20'
              )}
            >
              <div className={cn(
                'w-8 h-5 border-2 rounded-sm',
                size === 'index' ? 'border-brown' : 'border-brown/20'
              )} />
              <span className="text-xs font-semibold text-brown">4 x 6</span>
              <span className="text-[10px] text-brown/40">Index Card</span>
            </button>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-brown/60 hover:bg-brown/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onPrint(Array.from(selected), size)}
          disabled={selected.size === 0}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-colors',
            selected.size > 0
              ? 'bg-brown text-cream hover:bg-brown-light'
              : 'bg-brown/20 text-brown/40 cursor-not-allowed'
          )}
        >
          <Printer className="w-4 h-4" />
          Print{selected.size > 0 && selected.size < allKeys.length ? ` (${selected.size})` : ''}
        </button>
      </DialogFooter>
    </Dialog>
  )
}

// ─── Print Task Sheet (hidden, shown only in print) ──────
//
// Bold & clear style — big numbers, thick borders, large text.
// One full page per role. Blank rows fill remaining space.

interface PrintTaskSheetProps {
  roleGroups: RoleGroup[]
  selectedKeys: string[]
  locale: string
  zoneName: string
  pageSize: PrintSize
}

const BORDER = '2.5px solid #222'

export function PrintTaskSheet({ roleGroups, selectedKeys, locale, zoneName, pageSize }: PrintTaskSheetProps) {
  const filteredGroups = roleGroups.filter((g) => {
    const key = g.staffId || '__unassigned__'
    return selectedKeys.includes(key)
  }).filter((g) => g.sops.length > 0)

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const content = (
    <div
      className="print-task-sheet"
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '7.5in',
        background: 'white',
        zIndex: -1,
      }}
    >
      <style>{`
        @media print {
          @page { margin: ${pageSize === 'index' ? '0.2in 0.25in' : '0.4in 0.5in'}; size: ${pageSize === 'index' ? '6in 4in' : 'letter'}; }
          body > *:not(.print-task-sheet) { display: none !important; }
          .print-task-sheet {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            background: white !important;
            overflow: visible !important;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {filteredGroups.map((group, groupIndex) => {
        const isLast = groupIndex === filteredGroups.length - 1
        const isIndex = pageSize === 'index'

        return (
          <div key={group.staffId || 'unassigned'} className={isLast ? '' : 'print-page-break'}>

            {/* ═══ TITLE ═══ */}
            <div style={{
              textAlign: 'center',
              paddingBottom: isIndex ? '4px' : '8px',
              marginBottom: isIndex ? '3px' : '6px',
              borderBottom: isIndex ? '2px solid #000' : '4px solid #000',
            }}>
              <div style={{
                fontSize: isIndex ? '16px' : '32px',
                fontWeight: 900,
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: isIndex ? '1px' : '2px',
                lineHeight: 1.1,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}>
                {group.roleLabel}
              </div>
              {!isIndex && (
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#555', marginTop: '4px', letterSpacing: '0.5px' }}>
                  Daily Task List
                </div>
              )}
            </div>

            {/* ═══ Info row ═══ */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: isIndex ? '3px 0' : '8px 0',
              marginBottom: isIndex ? '4px' : '10px',
              borderBottom: isIndex ? '1px solid #000' : '2px solid #000',
              fontSize: isIndex ? '8px' : '13px',
            }}>
              <div>
                <span style={{ fontWeight: 800, color: '#000' }}>Date: </span>
                <span style={{ color: '#333' }}>{dateStr}</span>
              </div>
              <div>
                <span style={{ fontWeight: 800, color: '#000' }}>Zone: </span>
                <span style={{ color: '#333' }}>{zoneName}</span>
              </div>
              {!isIndex && (
                <div style={{ fontWeight: 700, color: '#000' }}>Brown Sugar Bakery</div>
              )}
            </div>

            {/* ═══ Task Rows ═══ */}
            {group.sops.map((sop, i) => {
              const sopName = locale === 'es' ? sop.name_es : sop.name_en
              const steps = sop.sop_steps?.sort((a, b) => a.step_number - b.step_number) || []
              const hasSteps = steps.length > 0

              if (isIndex) {
                // ── Index card: compact row ──
                return (
                  <div key={sop.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #ccc',
                    padding: '3px 0',
                  }}>
                    <span style={{
                      width: '20px',
                      fontSize: '9px',
                      fontWeight: 800,
                      color: '#888',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: '9px',
                      fontWeight: 600,
                      color: '#000',
                      lineHeight: 1.2,
                    }}>
                      {sopName}
                      {sop.is_critical && (
                        <span style={{
                          marginLeft: '4px',
                          fontSize: '6px',
                          fontWeight: 900,
                          color: '#fff',
                          background: '#c00',
                          padding: '0 3px',
                          borderRadius: '2px',
                          verticalAlign: 'middle',
                        }}>!</span>
                      )}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      border: '1.5px solid #555',
                      borderRadius: '2px',
                      flexShrink: 0,
                      marginLeft: '4px',
                    }} />
                  </div>
                )
              }

              // ── Full page: detailed row with steps + notes ──
              return (
                <div key={sop.id} style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  marginBottom: '8px',
                  pageBreakInside: 'avoid',
                }}>
                  {/* Number box */}
                  <div style={{
                    width: '56px',
                    background: '#e8e8e8',
                    border: BORDER,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: hasSteps ? '14px' : '0',
                    flexShrink: 0,
                    ...(!hasSteps && { alignItems: 'center' }),
                  }}>
                    <span style={{
                      fontSize: '22px',
                      fontWeight: 900,
                      color: '#000',
                      fontFamily: 'Georgia, "Times New Roman", serif',
                    }}>
                      #{i + 1}
                    </span>
                  </div>

                  {/* Task name + steps */}
                  <div style={{
                    flex: 1,
                    border: BORDER,
                    borderLeft: 'none',
                    padding: '10px 14px',
                  }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#000',
                      lineHeight: 1.3,
                      marginBottom: hasSteps ? '8px' : '0',
                    }}>
                      {sopName}
                      {sop.is_critical && (
                        <span style={{
                          marginLeft: '10px',
                          fontSize: '10px',
                          fontWeight: 900,
                          color: '#fff',
                          background: '#c00',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          verticalAlign: 'middle',
                        }}>
                          Priority
                        </span>
                      )}
                    </div>

                    {hasSteps && (
                      <div style={{ paddingLeft: '2px' }}>
                        {steps.map((step) => {
                          const stepTitle = locale === 'es' ? step.title_es : step.title_en
                          return (
                            <div key={step.id} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '4px 0',
                              borderBottom: '1px solid #ddd',
                            }}>
                              <span style={{
                                display: 'inline-block',
                                width: '14px',
                                height: '14px',
                                border: '1.5px solid #888',
                                borderRadius: '2px',
                                flexShrink: 0,
                                marginTop: '1px',
                              }} />
                              <span style={{ fontSize: '12px', color: '#333', fontWeight: 500, lineHeight: 1.3 }}>
                                {stepTitle}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div style={{ marginTop: hasSteps ? '8px' : '6px', fontSize: '9px', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Notes
                    </div>
                    <div style={{ borderBottom: '1px solid #bbb', marginTop: '12px' }} />
                    <div style={{ borderBottom: '1px solid #ddd', marginTop: '14px' }} />
                  </div>

                  {/* Checkbox */}
                  <div style={{
                    width: '44px',
                    border: BORDER,
                    borderLeft: 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: hasSteps ? '14px' : '0',
                    flexShrink: 0,
                    ...(!hasSteps && { alignItems: 'center' }),
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '22px',
                      height: '22px',
                      border: '2.5px solid #333',
                      borderRadius: '3px',
                    }} />
                  </div>
                </div>
              )
            })}

            {/* ═══ Footer ═══ */}
            {isIndex ? (
              <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '7px', color: '#aaa' }}>
                BSB &middot; {dateStr}
              </div>
            ) : (
              <div style={{
                marginTop: '20px',
                paddingTop: '10px',
                borderTop: '2px solid #000',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                fontSize: '11px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#000' }}>Signed:</span>
                  <span style={{ display: 'inline-block', width: '200px', borderBottom: '1.5px solid #555' }}>&nbsp;</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#000' }}>Time:</span>
                  <span style={{ display: 'inline-block', width: '100px', borderBottom: '1.5px solid #555' }}>&nbsp;</span>
                </div>
                <span style={{ fontSize: '9px', color: '#aaa' }}>BakeryOS</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // Render as direct child of <body> so CSS can hide siblings and page breaks work
  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
