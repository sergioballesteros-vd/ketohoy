import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DEFAULT_PREFERENCES } from '@/lib/recipeScoring'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { withErrorHandling } from '@/lib/apiError'

async function getOrCreatePreferences(userId: string) {
  return db.userPreferences.upsert({
    where: { userId },
    update: {},
    create: { userId, ...DEFAULT_PREFERENCES },
  })
}

const patchPreferencesSchema = z.object({
  ketoMode: z.enum(['strict', 'flexible', 'low_carb']).optional(),
  avoidFish: z.boolean().optional(),
  avoidPork: z.boolean().optional(),
  avoidDairy: z.boolean().optional(),
  // same bounds as the slider on /preferences (5-60 min, step 5)
  maxCookingMinutes: z.number().int().min(5).max(60).optional(),
})

// GET /api/preferences
export const GET = withErrorHandling(async () => {
  const prefs = await getOrCreatePreferences(await requireUserId())
  return NextResponse.json(prefs)
})

// PATCH /api/preferences
export const PATCH = withErrorHandling(async (request: Request) => {
  const body = patchPreferencesSchema.parse(await request.json())
  const prefs = await getOrCreatePreferences(await requireUserId())

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
