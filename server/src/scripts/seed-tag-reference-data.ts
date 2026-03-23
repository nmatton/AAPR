import * as fs from 'fs'
import * as path from 'path'
import { type Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { TAG_ALIASES } from '../constants/tag-aliases.constants'
import { normalizeTagKey, loadTagRelations } from '../services/affinity/affinity-reference-data'
import { ensureTagCatalog } from '../services/tags.service'

type TagLookup = Map<string, number>

type CandidateRow = {
  problemTagId: number
  solutionTagId: number
  justification: string
}

type RecommendationRow = {
  tagId: number
  recommendationText: string
  implementationExample: string
}

const DOCS_DIR = path.resolve(__dirname, '..', '..', '..', 'docs', 'tag_personality_affinity')
const PERSONALITY_RELATIONS_PATH = path.join(DOCS_DIR, 'tags_personality_relation.csv')
const ISSUE_CANDIDATES_PATH = path.join(DOCS_DIR, 'tags_issue_candidates.csv')
const RECOMMENDATIONS_PATH = path.join(DOCS_DIR, 'tag_recommendations.md')
const TRAITS = ['E', 'A', 'C', 'N', 'O'] as const

type SeedClient = PrismaClient | Prisma.TransactionClient

function normalizeAliasKey(name: string): string {
  return normalizeTagKey(name)
}

export function resolveTagNameToId(name: string, tagMap: TagLookup): number | null {
  const normalized = normalizeAliasKey(name)
  const aliasTarget = TAG_ALIASES[normalized]
  const resolvedName = aliasTarget ?? name.trim()
  return tagMap.get(normalizeTagKey(resolvedName)) ?? null
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function splitSemicolonLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ';' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function getNonEmptyLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function parseTagCandidates(content: string, tagMap: TagLookup): { rows: CandidateRow[]; warnings: string[] } {
  const lines = getNonEmptyLines(content)
  if (lines.length < 2) {
    throw new Error('Tag candidates CSV must include a header and at least one row')
  }

  const rows: CandidateRow[] = []
  const warnings: string[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const [problemTagRaw, candidateTagsRaw, justificationRaw] = splitSemicolonLine(lines[index])
    const problemTagId = resolveTagNameToId(problemTagRaw, tagMap)

    if (!problemTagId) {
      warnings.push(`Unresolved problem tag: ${problemTagRaw}`)
      continue
    }

    const candidateNames = candidateTagsRaw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)

    for (const candidateName of candidateNames) {
      const solutionTagId = resolveTagNameToId(candidateName, tagMap)
      if (!solutionTagId) {
        warnings.push(`Unresolved solution tag: ${candidateName}`)
        continue
      }

      rows.push({
        problemTagId,
        solutionTagId,
        justification: justificationRaw,
      })
    }
  }

  return { rows, warnings }
}

export function parseTagRecommendations(content: string, tagMap: TagLookup): { rows: RecommendationRow[]; warnings: string[] } {
  const lines = getNonEmptyLines(content)
  if (lines.length < 2) {
    throw new Error('Tag recommendations file must include a header and at least one row')
  }

  const rows: RecommendationRow[] = []
  const warnings: string[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const [tagName, recommendationText, implementationExample] = splitCsvLine(lines[index])
    const tagId = resolveTagNameToId(tagName, tagMap)
    if (!tagId) {
      warnings.push(`Unresolved recommendation tag: ${tagName}`)
      continue
    }

    rows.push({ tagId, recommendationText, implementationExample })
  }

  return { rows, warnings }
}

export async function buildTagLookup(client: SeedClient): Promise<TagLookup> {
  const tags = await client.tag.findMany({ select: { id: true, name: true } })
  return new Map(tags.map((tag) => [normalizeTagKey(tag.name), tag.id]))
}

export async function seedTagPersonalityRelations(client: SeedClient, tagMap: TagLookup): Promise<number> {
  const relationRows = loadTagRelations(PERSONALITY_RELATIONS_PATH)
  const data = relationRows.flatMap((row) => {
    const tagId = resolveTagNameToId(row.tag, tagMap)
    if (!tagId) {
      console.warn(`[seed-tag-reference-data] Unresolved personality relation tag: ${row.tag}`)
      return []
    }

    return TRAITS.map((trait) => ({
      tagId,
      trait,
      highPole: row.highPoles[trait as keyof typeof row.highPoles],
      lowPole: row.lowPoles[trait as keyof typeof row.lowPoles],
    }))
  })

  if (data.length === 0) {
    return 0
  }

  const result = await client.tagPersonalityRelation.createMany({
    data,
    skipDuplicates: true,
  })

  return result.count
}

export async function seedTagCandidates(client: SeedClient, tagMap: TagLookup): Promise<number> {
  const content = fs.readFileSync(ISSUE_CANDIDATES_PATH, 'utf-8')
  const { rows, warnings } = parseTagCandidates(content, tagMap)

  warnings.forEach((warning) => console.warn(`[seed-tag-reference-data] ${warning}`))

  if (rows.length === 0) {
    return 0
  }

  const result = await client.tagCandidate.createMany({
    data: rows,
    skipDuplicates: true,
  })

  return result.count
}

export async function seedTagRecommendations(client: SeedClient, tagMap: TagLookup): Promise<number> {
  const content = fs.readFileSync(RECOMMENDATIONS_PATH, 'utf-8')
  const { rows, warnings } = parseTagRecommendations(content, tagMap)

  warnings.forEach((warning) => console.warn(`[seed-tag-reference-data] ${warning}`))

  if (rows.length === 0) {
    return 0
  }

  const result = await Promise.all(
    rows.map((row) =>
      client.tagRecommendation.upsert({
        where: { tagId: row.tagId },
        create: row,
        update: {
          recommendationText: row.recommendationText,
          implementationExample: row.implementationExample,
        },
      })
    )
  )

  return result.length
}

export async function seedTagReferenceData(client: PrismaClient = prisma): Promise<void> {
  await client.$transaction(async (tx) => {
    await ensureTagCatalog(tx)
    const transactionTagMap = await buildTagLookup(tx)
    const relations = await seedTagPersonalityRelations(tx, transactionTagMap)
    const candidates = await seedTagCandidates(tx, transactionTagMap)
    const recommendations = await seedTagRecommendations(tx, transactionTagMap)
    console.log(
      `[seed-tag-reference-data] Seeded: ${relations} personality relations, ${candidates} candidates, ${recommendations} recommendations`
    )
    if (relations < 100)
      console.warn(`[seed-tag-reference-data] Expected 100 personality relation rows, got ${relations}`)
    if (recommendations < 19)
      console.warn(`[seed-tag-reference-data] Expected 19 recommendation rows, got ${recommendations}`)
  })
}

if (require.main === module) {
  seedTagReferenceData()
    .then(async () => {
      await prisma.$disconnect()
    })
    .catch(async (error) => {
      console.error('[seed-tag-reference-data] Failed to seed tag reference data', error)
      await prisma.$disconnect()
      process.exit(1)
    })
}