import * as nodemailer from 'nodemailer'
import {
  sendAddedToTeamEmail,
  sendInviteEmail,
  sendPasswordResetEmail,
  sendPrivacyCodeEmail
} from '../mailer'

type MockTransport = {
  sendMail: jest.Mock
}

jest.mock('nodemailer')

const mockCreateTransport = nodemailer.createTransport as unknown as jest.Mock

describe('Mailer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'user@example.com'
    process.env.SMTP_PASS = 'password'
    process.env.SMTP_FROM = 'noreply@example.com'
  })

  it('uses secure true for port 465', async () => {
    process.env.SMTP_PORT = '465'

    const transport: MockTransport = { sendMail: jest.fn().mockResolvedValue({ messageId: '1' }) }
    mockCreateTransport.mockReturnValue(transport)

    await sendInviteEmail({
      email: 'invitee@example.com',
      teamName: 'Team One',
      ctaUrl: 'http://localhost:5173/register'
    })

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 465,
        secure: true
      })
    )
  })

  it('uses secure false for non-465 port', async () => {
    const transport: MockTransport = { sendMail: jest.fn().mockResolvedValue({ messageId: '1' }) }
    mockCreateTransport.mockReturnValue(transport)

    await sendAddedToTeamEmail({
      email: 'member@example.com',
      teamName: 'Team Two',
      ctaUrl: 'http://localhost:5173/teams/2'
    })

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false
      })
    )
  })

  it('sends invite email with expected subject and body', async () => {
    const transport: MockTransport = { sendMail: jest.fn().mockResolvedValue({ messageId: '1' }) }
    mockCreateTransport.mockReturnValue(transport)

    await sendInviteEmail({
      email: 'invitee@example.com',
      teamName: 'Team Alpha',
      ctaUrl: 'http://localhost:5173/register'
    })

    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'invitee@example.com',
        from: 'noreply@example.com',
        subject: "You're invited to join Team Alpha on Addaptive Agile Practices Repository (AAPR)",
        text: expect.stringContaining("You've been invited to join the team 'Team Alpha' on Addaptive Agile Practices Repository (AAPR)"),
        html: expect.stringContaining('Create Account')
      })
    )
  })

  it('sends password reset email with reset URL in text and html', async () => {
    const transport: MockTransport = { sendMail: jest.fn().mockResolvedValue({ messageId: '1' }) }
    mockCreateTransport.mockReturnValue(transport)

    const resetUrl = 'http://localhost:5173/reset-password?token=abc123'
    await sendPasswordResetEmail({
      email: 'reset@example.com',
      resetUrl
    })

    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'reset@example.com',
        from: 'noreply@example.com',
        subject: 'Reset your AAPR password',
        text: expect.stringContaining(resetUrl),
        html: expect.stringContaining('href="http://localhost:5173/reset-password?token=abc123"')
      })
    )
  })

  it('escapes reset URL in html output', async () => {
    const transport: MockTransport = { sendMail: jest.fn().mockResolvedValue({ messageId: '1' }) }
    mockCreateTransport.mockReturnValue(transport)

    await sendPasswordResetEmail({
      email: 'escape@example.com',
      resetUrl: 'http://localhost/reset?token=<script>alert(1)</script>'
    })

    const sendMailArg = transport.sendMail.mock.calls[0][0]
    expect(sendMailArg.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(sendMailArg.html).not.toContain('<script>alert(1)</script>')
  })

  it('sends privacy code email with expected subject and code content', async () => {
    const transport: MockTransport = { sendMail: jest.fn().mockResolvedValue({ messageId: '1' }) }
    mockCreateTransport.mockReturnValue(transport)

    await sendPrivacyCodeEmail({
      email: 'privacy@example.com',
      privacyCode: 'RESEARCH-001'
    })

    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'privacy@example.com',
        from: 'noreply@example.com',
        subject: 'Your Personal Privacy Code for AAPR Research',
        text: expect.stringContaining('RESEARCH-001'),
        html: expect.stringContaining('RESEARCH-001')
      })
    )
  })

  it('escapes privacy code in html output', async () => {
    const transport: MockTransport = { sendMail: jest.fn().mockResolvedValue({ messageId: '1' }) }
    mockCreateTransport.mockReturnValue(transport)

    await sendPrivacyCodeEmail({
      email: 'escape@example.com',
      privacyCode: '<b>SECRET</b>'
    })

    const sendMailArg = transport.sendMail.mock.calls[0][0]
    expect(sendMailArg.html).toContain('&lt;b&gt;SECRET&lt;/b&gt;')
    expect(sendMailArg.html).not.toContain('<b>SECRET</b>')
  })
})
