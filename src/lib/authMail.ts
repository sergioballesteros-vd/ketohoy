import { appUrl } from '@/lib/appUrl'
import { sendMail } from '@/lib/mailer'
import { issueToken } from '@/lib/authTokens'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!)

function authEmail({
  heading,
  intro,
  button,
  url,
  note,
}: { heading: string; intro: string; button: string; url: string; note: string }): string {
  const safeUrl = escapeHtml(url)
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#f4f6f1;color:#172319;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f1;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e9e1;border-radius:16px;overflow:hidden;">
        <tr><td align="center" style="padding:28px 24px 20px;">
          <img src="${escapeHtml(`${appUrl()}/brand/ketohoy-icon-192.png`)}" width="44" height="44" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:10px;">
          <span style="display:inline-block;vertical-align:middle;margin-left:10px;color:#0c1a0d;font-size:22px;font-weight:700;letter-spacing:-.5px;">Keto<span style="color:#557d24;">Hoy</span></span>
        </td></tr>
        <tr><td style="padding:12px 32px 32px;">
          <h1 style="margin:0 0 16px;color:#0c1a0d;font-size:26px;line-height:1.25;font-weight:700;">${heading}</h1>
          <p style="margin:0 0 24px;color:#354238;font-size:16px;line-height:1.65;">${intro}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 22px;">
            <tr><td align="center" bgcolor="#a3e635" style="border-radius:10px;">
              <a href="${safeUrl}" style="display:inline-block;min-height:48px;box-sizing:border-box;padding:15px 24px;border-radius:10px;background:#a3e635;color:#0c1a0d;font-size:16px;line-height:18px;font-weight:700;text-align:center;text-decoration:none;">${button}</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#59655b;font-size:14px;line-height:1.5;">${note}</p>
          <p style="margin:0;color:#59655b;font-size:14px;line-height:1.5;">Si el botón no funciona, copia este enlace en tu navegador:</p>
          <p style="margin:8px 0 0;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${safeUrl}" style="color:#426b1c;">${safeUrl}</a></p>
        </td></tr>
        <tr><td style="padding:20px 24px;background:#f4f6f1;color:#59655b;text-align:center;font-size:13px;line-height:1.7;">
          ¿Necesitas ayuda? <a href="mailto:soporte@ketohoy.es" style="color:#355b16;">soporte@ketohoy.es</a>
          <br>Calle Felipe III, 9 · 28343 Valdemoro, Madrid, España
          <br><a href="${appUrl()}/legal#terminos" style="color:#355b16;">Términos</a> · <a href="${appUrl()}/legal#privacidad" style="color:#355b16;">Privacidad</a>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#758075;font-size:12px;line-height:1.5;">© KetoHoy</p>
    </td></tr>
  </table>
</body></html>`
}

export async function sendVerificationEmail(user: { id: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, 'verify')
  const url = `${appUrl()}/verify-email?token=${token}`
  await sendMail({
    to: user.email,
    subject: '🥑 Bienvenido a KetoHoy: confirma tu correo',
    text: `¡Te damos la bienvenida a KetoHoy!\n\nConfirma tu correo para empezar a organizar tus recetas y tu semana keto. Este enlace caduca en 24 horas.\n\n${url}\n\nSi no creaste la cuenta, ignora este mensaje.\n\n¿Necesitas ayuda? soporte@ketohoy.es\nTérminos: ${appUrl()}/legal#terminos\nPrivacidad: ${appUrl()}/legal#privacidad`,
    html: authEmail({
      heading: '¡Te damos la bienvenida!',
      intro: 'Nos alegra que te unas a KetoHoy. Confirma tu correo para empezar a guardar recetas y organizar tu semana keto.',
      button: 'Confirmar mi correo',
      url,
      note: 'Este enlace es válido durante 24 horas. Si no creaste la cuenta, puedes ignorar este mensaje.',
    }),
  })
}

export async function sendPasswordResetEmail(user: { id: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, 'reset')
  const url = `${appUrl()}/reset-password?token=${token}`
  await sendMail({
    to: user.email,
    subject: 'Instrucciones para restablecer tu contraseña · KetoHoy',
    text: `Hemos recibido una solicitud para cambiar la contraseña de tu cuenta de KetoHoy.\n\n${url}\n\nEste enlace es de un solo uso y caduca en 1 hora. Si no solicitaste el cambio, ignora este correo: tu contraseña seguirá siendo la misma.\n\n¿Necesitas ayuda? soporte@ketohoy.es\nTérminos: ${appUrl()}/legal#terminos\nPrivacidad: ${appUrl()}/legal#privacidad`,
    html: authEmail({
      heading: '¿Olvidaste tu contraseña?',
      intro: 'Hemos recibido una solicitud para cambiar la contraseña de tu cuenta de KetoHoy. Si fuiste tú, crea una nueva desde el botón.',
      button: 'Restablecer contraseña',
      url,
      note: 'Este enlace es de un solo uso y caduca en 1 hora. Si no solicitaste el cambio, ignora este correo: tu contraseña seguirá siendo la misma.',
    }),
  })
}
