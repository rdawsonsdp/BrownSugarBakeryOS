import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { AIChatRequest, AIChatResponse, AIGeneratedSOP } from '@/lib/types/ai-chat.types'

const anthropic = new Anthropic()

const CONVERSATION_SYSTEM_PROMPT = (zone: AIChatRequest['zone'], locale: string) => `You are a brief, no-frills assistant helping a bakery manager create an SOP.

Zone: ${zone.name_en} (${zone.slug})

Rules:
- Keep responses to 2-3 short sentences max
- Do NOT elaborate, expand, or add your own context
- Simply repeat back what the manager described in one sentence to confirm
- Then ask: "Are there any key steps needed to complete this?" (if not yet covered)
- Then ask: "Any notes or critical items to pay attention to?"
- That's it. Do not ask more than these two questions across the conversation.
- Record exactly what the manager says — do not invent extra steps or details

Respond in ${locale === 'es' ? 'Spanish' : 'English'}.`

const GENERATION_SYSTEM_PROMPT = (zone: AIChatRequest['zone'], categorySlugs: string[]) => {
  const categoryList = categorySlugs.length > 0
    ? categorySlugs.map((s) => `"${s}"`).join(' | ')
    : '"opening" | "cleaning" | "food_prep" | "closing" | "safety"'

  return `Based on the conversation, generate a bilingual SOP as a JSON object. Use ONLY what the manager described — do not add extra steps or context beyond what was said.

Zone: ${zone.name_en} (${zone.slug})

Output ONLY a JSON code block — no other text:

\`\`\`json
{
  "name_en": "string",
  "name_es": "string",
  "description_en": "string",
  "description_es": "string",
  "category": ${categoryList},
  "is_critical": boolean,
  "days_of_week": number[],
  "steps": [
    {
      "title_en": "string",
      "title_es": "string",
      "description_en": "string",
      "description_es": "string",
      "requires_photo": boolean,
      "estimated_minutes": number | null
    }
  ]
}
\`\`\`

Rules:
- Create steps ONLY from what the manager described — do not invent additional steps
- All text in BOTH English and Spanish
- days_of_week: 0=Sunday through 6=Saturday; [] means every day
- Set requires_photo only if the manager mentioned photo verification
- Set is_critical only if the manager flagged safety or critical concerns
- Choose the most appropriate category from the list above`
}

function parseGeneratedSOP(text: string): AIGeneratedSOP | undefined {
  // Try extracting from ```json``` code block first
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim())
    } catch {
      // Fall through to raw parse
    }
  }

  // Try parsing raw response
  try {
    return JSON.parse(text.trim())
  } catch {
    return undefined
  }
}

export async function POST(request: NextRequest) {
  // AI SOP creation is temporarily disabled
  return NextResponse.json(
    { error: 'AI SOP creation is temporarily disabled' },
    { status: 403 }
  )

  const body = await request.json() as AIChatRequest
  const { messages, zone, locale, generate } = body

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  try {
    // Fetch category slugs from DB for generation prompt
    let categorySlugs: string[] = []
    if (generate) {
      const supabase = await createClient()
      const { data: cats } = await supabase
        .from('categories')
        .select('slug')
        .eq('is_active', true)
        .order('sort_order')
      categorySlugs = cats?.map((c: { slug: string }) => c.slug) ?? []
    }

    const systemPrompt = generate
      ? GENERATION_SYSTEM_PROMPT(zone, categorySlugs)
      : CONVERSATION_SYSTEM_PROMPT(zone, locale)

    const apiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // When generating, append an explicit instruction so the model outputs JSON
    if (generate) {
      // Ensure last message is from user
      if (apiMessages.length === 0 || apiMessages[apiMessages.length - 1].role !== 'user') {
        apiMessages.push({ role: 'user', content: 'Generate the SOP now as a JSON code block based on everything I described.' })
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: apiMessages,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock?.text || ''

    if (generate) {
      const sop = parseGeneratedSOP(text)
      if (!sop) {
        console.error('Failed to parse AI response:', text.substring(0, 500))
        return NextResponse.json(
          { error: 'Failed to parse generated SOP' },
          { status: 500 }
        )
      }
      const result: AIChatResponse = { message: text, sop }
      return NextResponse.json(result)
    }

    const result: AIChatResponse = { message: text }
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI SOP generation error:', error)
    return NextResponse.json(
      { error: 'AI service unavailable' },
      { status: 503 }
    )
  }
}
