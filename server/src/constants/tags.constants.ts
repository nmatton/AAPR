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

export const TAG_DESCRIPTIONS: Record<ValidTag, string> = {
  'Written / Async-Ready': 'Can be accomplished effectively through writing or offline contribution without immediate real-time presence',
  'Visual / Tactile': 'Uses physical or digital boards, cards, or diagrams to communicate rather than just conversation',
  'Verbal-Heavy': 'Success that relies heavily on speaking up, debating, or verbalizing thoughts in real-time',
  'Remote-Friendly': 'Well suited for remote work',
  'Co-located / On-Site': 'Physical presence required to defuse delays and facilitate communication',
  'Small Group / Pair': 'Done in intimate groups of 2-3 people',
  'Whole Crowd': 'Requires the presence and attention of the entire team (and sometimes stakeholders)',
  'Solo-Capable': 'Can be performed individually, even if the result is shared later',
  'Structured / Facilitated': 'Has a clear agenda, a facilitator, and specific steps (not a free-for-all)',
  'Time-Boxed': 'Has a strict, short duration (often <15 mins or rigid intervals)',
  'Gamified': 'Uses distinct rules, turns, voting mechanisms, or physical props with depersonalization of debates through gaming or abstraction',
  'Spontaneous / Improv': 'Requires thinking on your feet, answering unexpected questions on-the-fly, or brainstorming from scratch',
  'High Visibility': 'Practice requiring exposure and presentation of one\'s work in front of a large or hierarchical group',
  'Consensus-Driven': 'The activity cannot end until everyone agrees (or compromises)',
  'Critical / Introspective': 'Direct analysis and evaluation of past work or peers',
  'Role-Fluid': 'Rotation of administrative duties to prevent socio-technical erosion',
  'Fast-Feedback': 'Ultra-short feedback loop limiting latency and stagnation',
  'User-Feedback Oriented': 'Direct, rapid or frequent contact with the end user',
  'Documented / Traceable': 'Creation of a long-term, searchable memory of the project and team',
  'Maintenance-Aware': 'Explicitly taking into account technical debt and legacy'
}

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
