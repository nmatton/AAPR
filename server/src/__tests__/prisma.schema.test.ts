import fs from 'fs'
import path from 'path'

describe('Prisma schema', () => {
  it('defines TeamInvite model with required mappings', () => {
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    expect(schema).toContain('model TeamInvite')
    expect(schema).toContain('@@map("team_invites")')
    expect(schema).toContain('@@unique([teamId, email]')
    expect(schema).toContain('@map("team_id")')
    expect(schema).toContain('@map("invited_by")')
    expect(schema).toContain('@map("invited_user_id")')
    expect(schema).toContain('@map("last_sent_at")')
    expect(schema).toContain('@map("error_message")')
  })
})
