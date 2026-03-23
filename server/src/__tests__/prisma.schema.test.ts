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

  it('defines tag reference data models with required mappings', () => {
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    expect(schema).toContain('model TagPersonalityRelation')
    expect(schema).toContain('@@map("tag_personality_relations")')
    expect(schema).toContain('@@id([tagId, trait])')
    expect(schema).toContain('@map("high_pole")')
    expect(schema).toContain('@map("low_pole")')

    expect(schema).toContain('model TagCandidate')
    expect(schema).toContain('@@map("tag_candidates")')
    expect(schema).toContain('@@id([problemTagId, solutionTagId])')
    expect(schema).toContain('@map("problem_tag_id")')
    expect(schema).toContain('@map("solution_tag_id")')

    expect(schema).toContain('model TagRecommendation')
    expect(schema).toContain('@@map("tag_recommendations")')
    expect(schema).toContain('@map("recommendation_text")')
    expect(schema).toContain('@map("implementation_example")')
  })
})
