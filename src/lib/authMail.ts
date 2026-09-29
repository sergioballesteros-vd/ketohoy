import { appUrl } from '@/lib/appUrl'
import { sendMail } from '@/lib/mailer'
import { issueToken } from '@/lib/authTokens'

export async function sendVerificationEmail(user: { id: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, 'verify')
  await sendMail({
    to: user.email,
    subject: 'Confirma tu email en KetoHoy',
    text: `Confirma tu email (válido 24 h):\n${appUrl()}/verify-email?token=${token}\n\nSi no creaste la cuenta, ignora este mensaje.`,
  })
}

export async function sendPasswordResetEmail(user: { id: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, 'reset')
  await sendMail({
    to: user.email,
    subject: 'Restablece tu contraseña de KetoHoy',
    text: `Restablece tu contraseña (válido 1 h, un solo uso):\n${appUrl()}/reset-password?token=${token}\n\nSi no lo pediste, ignora este mensaje: tu contraseña no cambia.`,
  })
}
