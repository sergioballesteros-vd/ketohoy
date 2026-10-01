import { afterEach, expect, it, vi } from 'vitest'
import { sendMail } from '@/lib/mailer'

const originalKey = process.env.RESEND_API_KEY
afterEach(() => {
  if (originalKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = originalKey
  vi.unstubAllGlobals()
})

it('sends auth mail through Resend without logging its token', async () => {
  process.env.RESEND_API_KEY = 'test-key'
  const fetchMock = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)

  await sendMail({ to: 'user@example.com', subject: 'Verify', text: 'token=secret' })

  expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
    method: 'POST',
    headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'KetoHoy <no-reply@ketohoy.es>', to: 'user@example.com', subject: 'Verify', text: 'token=secret' }),
  }))
})

it('fails if the key is missing or Resend rejects the email', async () => {
  delete process.env.RESEND_API_KEY
  await expect(sendMail({ to: 'user@example.com', subject: 'Verify', text: 'link' })).rejects.toThrow('RESEND_API_KEY is missing')

  process.env.RESEND_API_KEY = 'test-key'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
  await expect(sendMail({ to: 'user@example.com', subject: 'Verify', text: 'link' })).rejects.toThrow('Resend email failed (403)')
})
