import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withErrorHandling } from '@/lib/apiError'

async function getOrCreatePreferences() {
  const existing = await db.userPreferences.findFirst()
  if (existing) return existing
  return db.userPreferences.create({ data: {} })
}

const patchPreferencesSchema = z.object({
  ketoMode: z.enum(['strict', 'flexible', 'low_carb']).optional(),
  avoidFish: z.boolean().optional(),
  avoidPork: z.boolean().optional(),
  avoidDairy: z.boolean().optional(),
  maxCookingMinutes: z.number().int().positive().optional(),
})

// GET /api/preferences
export const GET = withErrorHandling(async () => {
  const prefs = await getOrCreatePreferences()
  return NextResponse.json(prefs)
})

// PATCH /api/preferences
export const PATCH = withErrorHandling(async (request: Request) => {
  const body = patchPreferencesSchema.parse(await request.json())
  const prefs = await getOrCreatePreferences()

  const updated = await db.userPreferences.update({
    where: { id: prefs.id },
    data: {
      ketoMode: body.ketoMode ?? prefs.ketoMode,
      avoidFish: body.avoidFish ?? prefs.avoidFish,
      avoidPork: body.avoidPork ?? prefs.avoidPork,
      avoidDairy: body.avoidDairy ?? prefs.avoidDairy,
      maxCookingMinutes: body.maxCookingMinutes ?? prefs.maxCookingMinutes,
    },
  })
  return NextResponse.json(updated)
})
