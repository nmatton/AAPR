export const VALID_TAGS = [
  'Written / Async-Ready',
  'Visual / Tactile',
  'Verbal-Heavy',
  'Remote-Friendly',
  'Co-located / On-Site',
  'Small Group / Pair',
  'Whole Crowd',
  'Solo-Capable',
  'Structured / Facilitated',
  'Time-Boxed',
  'Gamified',
  'Spontaneous / Improv',
  'High Visibility',
  'Consensus-Driven',
  'Critical / Introspective',
  'Role-Fluid',
  'Fast-Feedback',
  'User-Feedback Oriented',
  'Documented / Traceable',
  'Maintenance-Aware'
] as const

export type ValidTag = (typeof VALID_TAGS)[number]

export const TAG_CATEGORIES = [
  {
    name: 'Interaction & Communication Style',
    tags: [
      'Written / Async-Ready',
      'Visual / Tactile',
      'Verbal-Heavy',
      'Remote-Friendly',
      'Co-located / On-Site'
    ]
  },
  {
    name: 'Social Density & Energy',
    tags: ['Small Group / Pair', 'Whole Crowd', 'Solo-Capable']
  },
  {
    name: 'Structure & Cognitive Load',
    tags: ['Structured / Facilitated', 'Time-Boxed', 'Gamified', 'Spontaneous / Improv']
  },
  {
    name: 'Emotional & Conflict Exposure',
    tags: ['High Visibility', 'Consensus-Driven', 'Critical / Introspective', 'Role-Fluid']
  },
  {
    name: 'Technical Cadence & Feedback Loop',
    tags: ['Fast-Feedback', 'User-Feedback Oriented']
  },
  {
    name: 'Knowledge & Technical Continuity',
    tags: ['Documented / Traceable', 'Maintenance-Aware']
  }
] as const

export type TagCategory = (typeof TAG_CATEGORIES)[number]['name']

const VALID_TAG_SET = new Set<string>(VALID_TAGS)

export const isValidTag = (value: string): value is ValidTag => VALID_TAG_SET.has(value)

export const normalizeValidTags = (tags?: readonly string[] | null): ValidTag[] => {
  if (!tags) {
    return []
  }

  const seen = new Set<string>()
  return tags
    .map((tag) => tag.trim())
    .filter((tag): tag is ValidTag => {
      if (!isValidTag(tag) || seen.has(tag)) {
        return false
      }
      seen.add(tag)
      return true
    })
}
