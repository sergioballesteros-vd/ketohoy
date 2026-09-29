// ponytail: no email provider yet — messages go to the server console.
// Swap the body of sendMail for Resend/SMTP when credentials exist; callers don't change.
export async function sendMail(msg: { to: string; subject: string; text: string }): Promise<void> {
  console.info(`[mail] to=${msg.to} subject="${msg.subject}"\n${msg.text}`)
}

