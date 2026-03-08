'use client'

import type { SOPWithSteps, Category } from '@/lib/types/database.types'

interface SOPPrintCardProps {
  sop: SOPWithSteps
  categories?: Category[]
}

export function SOPPrintCard({ sop, categories = [] }: SOPPrintCardProps) {
  const match = categories.find((c) => c.slug === sop.category)
  const categoryEn = match?.name_en ?? sop.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const categoryEs = match?.name_es ?? categoryEn

  return (
    <div className="print-only p-8 max-w-4xl mx-auto">
      <div className="border-2 border-black rounded-lg p-6">
        {/* Header */}
        <div className="grid grid-cols-2 gap-4 border-b-2 border-black pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">{sop.name_en}</h1>
            {sop.description_en && <p className="text-sm mt-1">{sop.description_en}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">{sop.name_es}</h1>
            {sop.description_es && <p className="text-sm mt-1">{sop.description_es}</p>}
          </div>
        </div>

        {/* Category / Critical badges */}
        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium uppercase">{categoryEn} / {categoryEs}</span>
          {sop.is_critical && (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">CRITICAL / CRITICO</span>
          )}
        </div>

        {/* Steps - bilingual side by side */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-sm w-8">#</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">English</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">Español</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm w-8">✓</th>
            </tr>
          </thead>
          <tbody>
            {sop.sop_steps?.map((step) => (
              <tr key={step.id}>
                <td className="border border-gray-300 px-3 py-2 text-center font-bold">{step.step_number}</td>
                <td className="border border-gray-300 px-3 py-2">
                  <p className="font-medium text-sm">{step.title_en}</p>
                  {step.description_en && <p className="text-xs text-gray-600 mt-0.5">{step.description_en}</p>}
                  {step.requires_photo && <span className="text-xs text-blue-600">📷 Photo required</span>}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <p className="font-medium text-sm">{step.title_es}</p>
                  {step.description_es && <p className="text-xs text-gray-600 mt-0.5">{step.description_es}</p>}
                  {step.requires_photo && <span className="text-xs text-blue-600">📷 Foto requerida</span>}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-300 text-xs text-gray-500 flex justify-between">
          <span>Brown Sugar Bakery — BakeryOS</span>
          <span>Version {sop.version} — {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
