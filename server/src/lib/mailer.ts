import nodemailer from 'nodemailer'

/**
 * HTML escape function to prevent XSS in email templates
 */
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export interface InviteEmailPayload {
  email: string
  teamName: string
  ctaUrl: string
}

interface MailConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

const getMailConfig = (): MailConfig => {
  const host = process.env.SMTP_HOST
  const portValue = process.env.SMTP_PORT
  const from = process.env.SMTP_FROM

  if (!host || !portValue || !from) {
    throw new Error('SMTP configuration is missing')
  }

  const port = Number(portValue)
  if (Number.isNaN(port)) {
    throw new Error('SMTP_PORT must be a number')
  }

  return {
    host,
    port,
    secure: port === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from
  }
}

const createTransporter = () => {
  const config = getMailConfig()
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined
  })
}

const buildInviteEmail = (payload: InviteEmailPayload) => {
  const escapedTeamName = escapeHtml(payload.teamName)
  const subject = `You're invited to join ${payload.teamName} on bmad_version`
  const text = `You've been invited to join the team '${payload.teamName}' on bmad_version. Please sign up using this email address to access the platform.\n\nCreate Account: ${payload.ctaUrl}`
  const html = `
    <p>You've been invited to join the team '<strong>${escapedTeamName}</strong>' on bmad_version.</p>
    <p>Please sign up using this email address to access the platform.</p>
    <p><a href="${escapeHtml(payload.ctaUrl)}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Create Account</a></p>
  `.trim()

  return { subject, text, html }
}

const buildAddedEmail = (payload: InviteEmailPayload) => {
  const escapedTeamName = escapeHtml(payload.teamName)
  const subject = `You've been added to the team ${payload.teamName}`
  const text = `You've been added to the team '${payload.teamName}' on bmad_version. Click the link to access it now.\n\nView Team: ${payload.ctaUrl}`
  const html = `
    <p>You've been added to the team '<strong>${escapedTeamName}</strong>' on bmad_version.</p>
    <p>Click the link to access it now.</p>
    <p><a href="${escapeHtml(payload.ctaUrl)}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;">View Team</a></p>
  `.trim()

  return { subject, text, html }
}

const sendEmail = async (payload: InviteEmailPayload, builder: (p: InviteEmailPayload) => { subject: string; text: string; html: string }) => {
  const config = getMailConfig()
  const transporter = createTransporter()
  const { subject, text, html } = builder(payload)

  await transporter.sendMail({
    from: config.from,
    to: payload.email,
    subject,
    text,
    html
  })
}

export const sendInviteEmail = async (payload: InviteEmailPayload): Promise<void> => {
  await sendEmail(payload, buildInviteEmail)
}

export const sendAddedToTeamEmail = async (payload: InviteEmailPayload): Promise<void> => {
  await sendEmail(payload, buildAddedEmail)
}
