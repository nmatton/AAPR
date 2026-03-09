import { describe, expect, it } from '@jest/globals'
import { PracticeSchema } from './practice.schema'
import { VALID_TAGS } from '../constants/tags.constants'

const basePractice = {
  name: 'Test Practice',
  type: 'Engineering & Delivery',
  objective: 'Improve quality',
  practice_goal: ['Code Quality & Simple Design']
}

describe('PracticeSchema tag validation', () => {
  it('accepts tags from the closed taxonomy', () => {
    const parsed = PracticeSchema.safeParse({
      ...basePractice,
      tags: [VALID_TAGS[0], VALID_TAGS[1]]
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects invalid tags', () => {
    const parsed = PracticeSchema.safeParse({
      ...basePractice,
      tags: ['legacy-tag']
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts an empty tags array', () => {
    const parsed = PracticeSchema.safeParse({
      ...basePractice,
      tags: []
    })

    expect(parsed.success).toBe(true)
  })
})
