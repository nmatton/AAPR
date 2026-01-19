import * as nodemailer from 'nodemailer'
import { sendAddedToTeamEmail, sendInviteEmail } from '../mailer'

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
        subject: "You're invited to join Team Alpha on bmad_version",
        text: expect.stringContaining("You've been invited to join the team 'Team Alpha' on bmad_version"),
        html: expect.stringContaining('Create Account')
      })
    )
  })
})
