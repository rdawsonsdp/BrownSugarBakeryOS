'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Download, TrendingUp, Users, Calendar, Award } from 'lucide-react'

// --- Types ---

interface DailyStat {
  date: string
  total: number
  completed: number
  completion_rate: number
}

interface StaffPerformance {
  staff_id: string
  display_name: string
  total_tasks: number
  completed_tasks: number
  completion_rate: number
}

interface ZoneComparison {
  zone_id: string
  zone_name_en: string
  zone_name_es: string
  zone_color: string
  total: number
  completed: number
  completion_rate: number
}

interface AnalyticsData {
  daily: DailyStat[]
  staffPerformance: StaffPerformance[]
  zoneComparison: ZoneComparison[]
  summary: {
    total_tasks: number
    completed_tasks: number
    overall_rate: number
    best_day: string
    worst_day: string
    total_shifts: number
  }
}

// --- Constants ---

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const

// --- Helpers ---

function formatDate(dateStr: string, locale: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function rateColor(rate: number): string {
  if (rate >= 80) return 'bg-success'
  if (rate >= 50) return 'bg-warning'
  return 'bg-red'
}

function rateTextColor(rate: number): string {
  if (rate >= 80) return 'text-success'
  if (rate >= 50) return 'text-warning'
  return 'text-red'
}

// --- Component ---

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const [days, setDays] = useState(7)

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?days=${days}`)
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json()
    },
  })

  const handleExportCSV = useCallback(() => {
    if (!data) return

    const headers = ['Date', 'Total Tasks', 'Completed', 'Completion Rate (%)']
    const rows = data.daily.map((d) => [d.date, d.total, d.completed, d.completion_rate].join(','))
    const csv = [headers.join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bakery-analytics-${days}d.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [data, days])

  const isEs = locale === 'es'

  return (
    <div className="min-h-dvh bg-cream">
      {/* Header */}
      <div className="bg-brown text-white px-4 pt-4 pb-5 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">
              {isEs ? 'Analisis' : 'Analytics'}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Date Range Pills */}
        <div className="flex gap-2">
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
                days === range.days
                  ? 'bg-brown text-cream'
                  : 'bg-white text-brown/60 border border-brown/10 hover:bg-brown/5'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                icon={<TrendingUp className="w-5 h-5 text-brown/40" />}
                label={isEs ? 'Tareas Totales' : 'Total Tasks'}
                value={String(data.summary.total_tasks)}
              />
              <SummaryCard
                icon={<Award className="w-5 h-5 text-brown/40" />}
                label={isEs ? 'Tasa de Cumplimiento' : 'Completion Rate'}
                value={`${data.summary.overall_rate}%`}
                valueColor={rateTextColor(data.summary.overall_rate)}
              />
              <SummaryCard
                icon={<Calendar className="w-5 h-5 text-brown/40" />}
                label={isEs ? 'Turnos Totales' : 'Total Shifts'}
                value={String(data.summary.total_shifts)}
              />
              <SummaryCard
                icon={<TrendingUp className="w-5 h-5 text-success" />}
                label={isEs ? 'Mejor Dia' : 'Best Day'}
                value={formatDate(data.summary.best_day, locale)}
              />
            </div>

            {/* Daily Completion Chart */}
            {data.daily.length > 0 && (
              <section className="bg-white rounded-2xl border border-brown/10 p-4 space-y-3">
                <h2 className="text-sm font-bold text-brown">
                  {isEs ? 'Cumplimiento Diario' : 'Daily Completion'}
                </h2>
                <div className="space-y-2">
                  {data.daily.map((d) => (
                    <DailyBar
                      key={d.date}
                      label={formatDate(d.date, locale)}
                      rate={d.completion_rate}
                      completed={d.completed}
                      total={d.total}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Staff Leaderboard */}
            {data.staffPerformance.length > 0 && (
              <section className="bg-white rounded-2xl border border-brown/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-brown/40" />
                  <h2 className="text-sm font-bold text-brown">
                    {isEs ? 'Tabla de Personal' : 'Staff Leaderboard'}
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.staffPerformance.map((staff, index) => (
                    <StaffRow
                      key={staff.staff_id}
                      rank={index + 1}
                      name={staff.display_name}
                      rate={staff.completion_rate}
                      taskCount={staff.total_tasks}
                      completedCount={staff.completed_tasks}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Zone Comparison */}
            {data.zoneComparison.length > 0 && (
              <section className="bg-white rounded-2xl border border-brown/10 p-4 space-y-3">
                <h2 className="text-sm font-bold text-brown">
                  {isEs ? 'Comparacion por Zona' : 'Zone Comparison'}
                </h2>
                <div className="space-y-2">
                  {data.zoneComparison.map((zone) => (
                    <ZoneBar
                      key={zone.zone_id}
                      name={isEs ? zone.zone_name_es : zone.zone_name_en}
                      color={zone.zone_color}
                      rate={zone.completion_rate}
                      completed={zone.completed}
                      total={zone.total}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {data.daily.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="w-10 h-10 text-brown/20 mx-auto mb-3" />
                <p className="text-sm text-brown/40">
                  {isEs
                    ? 'No hay datos para este periodo.'
                    : 'No data available for this period.'}
                </p>
              </div>
            )}

            {/* Export CSV */}
            {data.daily.length > 0 && (
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={handleExportCSV}
              >
                <Download className="w-4 h-4" />
                {isEs ? 'Exportar CSV' : 'Export CSV'}
              </Button>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

// --- Sub-Components ---

function SummaryCard({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-brown/10 p-4 space-y-2">
      {icon}
      <p className="text-xs text-brown/50 font-medium">{label}</p>
      <p className={cn('text-xl font-bold text-brown', valueColor)}>{value}</p>
    </div>
  )
}

function DailyBar({
  label,
  rate,
  completed,
  total,
}: {
  label: string
  rate: number
  completed: number
  total: number
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-brown/50 w-14 flex-shrink-0 text-right">{label}</span>
      <div className="flex-1 h-5 bg-brown/5 rounded-full overflow-hidden relative">
        <div
          className={cn('h-full rounded-full transition-all duration-500', rateColor(rate))}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={cn('text-xs font-bold w-10 text-right', rateTextColor(rate))}>
        {rate}%
      </span>
      <span className="text-[10px] text-brown/30 w-12 text-right">
        {completed}/{total}
      </span>
    </div>
  )
}

function StaffRow({
  rank,
  name,
  rate,
  taskCount,
  completedCount,
}: {
  rank: number
  name: string
  rate: number
  taskCount: number
  completedCount: number
}) {
  const isFirst = rank === 1

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-xl',
        isFirst ? 'bg-[#D4A857]/5 border border-[#D4A857]/20' : ''
      )}
    >
      <span
        className={cn(
          'text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
          isFirst ? 'bg-[#D4A857] text-white' : 'bg-brown/5 text-brown/40'
        )}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold text-brown truncate', isFirst && 'text-[#D4A857]')}>
          {name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-brown/5 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', rateColor(rate))}
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className={cn('text-[10px] font-bold', rateTextColor(rate))}>
            {rate}%
          </span>
        </div>
      </div>
      <span className="text-[10px] text-brown/30 flex-shrink-0">
        {completedCount}/{taskCount}
      </span>
    </div>
  )
}

function ZoneBar({
  name,
  color,
  rate,
  completed,
  total,
}: {
  name: string
  color: string
  rate: number
  completed: number
  total: number
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-brown">{name}</span>
        </div>
        <span className="text-xs text-brown/50">
          {completed}/{total} ({rate}%)
        </span>
      </div>
      <div className="h-2 bg-brown/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${rate}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
