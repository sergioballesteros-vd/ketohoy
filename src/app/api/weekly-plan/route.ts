import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { withErrorHandling } from '@/lib/apiError'
import { getMonday } from '@/lib/dateUtils'

export const GET = withErrorHandling(async () => {
  const userId = await requireUserId()
  const monday = getMonday(new Date())

  const plan = await db.weeklyPlan.findFirst({
    where: { weekStart: monday, userId },
    include: {
      meals: {
        include: { recipe: true },
        orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
      },
    },
  })

  return NextResponse.json(plan)
})
