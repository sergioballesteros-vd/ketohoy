import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getOrCreatePreferences() {
  const existing = await db.userPreferences.findFirst()
  if (existing) return existing
  return db.userPreferences.create({ data: {} })
}

// GET /api/preferences
export async function GET() {
  const prefs = await getOrCreatePreferences()
  return NextResponse.json(prefs)
}

// PATCH /api/preferences
export async function PATCH(request: Request) {
  const body = await request.json()
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
}
