// Shared vi.mock factory for route tests that don't care about auth itself:
// every request is "logged in" as one fixed test user (created on first use,
// since userId columns have a foreign key to User).
export const authMock = {
  requireUserId: async () => {
    const { db } = await import('@/lib/db')
    const user = await db.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: { email: 'test@example.com', passwordHash: 'x' },
    })
    return user.id
  },
}
