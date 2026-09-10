import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withErrorHandling } from '@/lib/apiError'
import { getMonday } from '@/lib/dateUtils'

export const GET = withErrorHandling(async () => {
  const monday = getMonday(new Date())

  const plan = await db.weeklyPlan.findFirst({
    where: { weekStart: monday },
    include: {
      meals: {
        include: { recipe: true },
        orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
      },
    },
  })

  return NextResponse.json(plan)
})
