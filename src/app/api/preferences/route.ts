import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getOrCreatePreferences() {
  const existing = await db.userPreferences.findFirst()
  if (existing) return existing
  return db.userPreferences.create({ data: {} })
}

const allowedKetoModes = new Set(['strict', 'flexible', 'low_carb'])

// GET /api/preferences
export async function GET() {
  const prefs = await getOrCreatePreferences()
  return NextResponse.json(prefs)
}

// PATCH /api/preferences
export async function PATCH(request: Request) {
  const body = await request.json()
  const prefs = await getOrCreatePreferences()
  if (body.ketoMode !== undefined && !allowedKetoModes.has(body.ketoMode)) {
    return NextResponse.json({ error: 'Invalid ketoMode' }, { status: 400 })
  }

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
