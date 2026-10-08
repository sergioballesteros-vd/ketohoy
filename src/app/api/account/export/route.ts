import { z } from 'zod'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { accountExport } from '@/lib/accountData'

const requestSchema = z.object({ favoriteProductIds: z.array(z.string().min(1).max(128)).max(1000).optional().default([]) }).strict()

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid export request' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid export request' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })

  try {
    const data = await accountExport(user.id, [...new Set(parsed.data.favoriteProductIds)])
    if (!data) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ketohoy-data-export.json"',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
