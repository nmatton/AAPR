import * as fs from 'fs'
import * as path from 'path'
import {
  type BoundsConfig,
  type TagRelationRow,
  type TraitKey,
  TRAIT_KEYS,
  SYMBOL_MAP,
  type RelationSymbol,
} from './affinity.types'

/**
 * Normalize a tag string for comparison: trim, collapse whitespace, lowercase.
 */
export function normalizeTagKey(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Parse a decimal string that may use comma as decimal separator.
 */
function parseDecimal(raw: string): number {
  const normalized = raw.trim().replace(',', '.')
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    return Number.NaN
  }
  return Number(normalized)
}

/**
 * Load and validate personality score bounds from CSV.
 * Expected format: tab-separated, header row, then one row per trait.
 *
 * @throws Error if file is missing, malformed, or bounds are invalid.
 */
export function loadBoundsConfig(filePath: string): BoundsConfig {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    throw new Error('Bounds CSV must have a header row and at least one data row')
  }

  const bounds: Partial<BoundsConfig> = {}

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t')
    if (cols.length < 3) {
      throw new Error(`Bounds CSV row ${i + 1}: expected 3 columns, got ${cols.length}`)
    }

    const trait = cols[0].trim().toUpperCase() as TraitKey
    if (!TRAIT_KEYS.includes(trait)) {
      throw new Error(`Bounds CSV row ${i + 1}: unknown trait '${cols[0].trim()}'`)
    }
    if (bounds[trait]) {
      throw new Error(`Bounds CSV row ${i + 1}: duplicate trait '${trait}'`)
    }

    const lowBound = parseDecimal(cols[1])
    const highBound = parseDecimal(cols[2])

    if (isNaN(lowBound) || isNaN(highBound)) {
      throw new Error(`Bounds CSV row ${i + 1}: non-numeric bound values`)
    }

    if (highBound <= lowBound) {
      throw new Error(
        `Bounds CSV: highBound (${highBound}) must be greater than lowBound (${lowBound}) for trait ${trait}`
      )
    }

    bounds[trait] = { lowBound, highBound }
  }

  // Validate all five traits are present
  for (const key of TRAIT_KEYS) {
    if (!bounds[key]) {
      throw new Error(`Bounds CSV: missing trait '${key}'`)
    }
  }

  return bounds as BoundsConfig
}

/**
 * Validate that a CSV cell contains a valid relation symbol.
 */
function parseSymbol(raw: string, context: string): number {
  const trimmed = raw.trim()
  if (!(trimmed in SYMBOL_MAP)) {
    throw new Error(`${context}: invalid symbol '${trimmed}', expected +, 0, or -`)
  }
  return SYMBOL_MAP[trimmed as RelationSymbol]
}

/**
 * Load and validate tag-personality relation data from CSV.
 * Expected format: semicolon-separated, header row, then one row per tag.
 * Columns: Tag;High E;Low E;High A;Low A;High C;Low C;High N;Low N;High O;Low O
 *
 * @throws Error if file is missing, malformed, or symbols are invalid.
 */
export function loadTagRelations(filePath: string): TagRelationRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    throw new Error('Tag relations CSV must have a header row and at least one data row')
  }

  const rows: TagRelationRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';')
    if (cols.length < 11) {
      throw new Error(
        `Tag relations CSV row ${i + 1}: expected 11 columns, got ${cols.length}`
      )
    }

    const tag = cols[0].trim()
    const context = `Tag relations CSV row ${i + 1} (tag '${tag}')`

    const highPoles: Record<TraitKey, number> = {
      E: parseSymbol(cols[1], context),
      A: parseSymbol(cols[3], context),
      C: parseSymbol(cols[5], context),
      N: parseSymbol(cols[7], context),
      O: parseSymbol(cols[9], context),
    }

    const lowPoles: Record<TraitKey, number> = {
      E: parseSymbol(cols[2], context),
      A: parseSymbol(cols[4], context),
      C: parseSymbol(cols[6], context),
      N: parseSymbol(cols[8], context),
      O: parseSymbol(cols[10], context),
    }

    rows.push({
      tag,
      normalizedTag: normalizeTagKey(tag),
      highPoles,
      lowPoles,
    })
  }

  return rows
}

/**
 * Cached reference data singleton.
 */
let cachedBounds: BoundsConfig | null = null
let cachedRelations: TagRelationRow[] | null = null

/**
 * Get the project root-relative path to reference data files.
 */
function resolveRefPath(filename: string): string {
  return path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'tag_personality_affinity', filename)
}

/**
 * Load (and cache) both reference datasets. Call once at startup or on first use.
 */
export function getReferenceData(): { bounds: BoundsConfig; relations: TagRelationRow[] } {
  if (!cachedBounds) {
    cachedBounds = loadBoundsConfig(resolveRefPath('personality_score_bounds.csv'))
  }
  if (!cachedRelations) {
    cachedRelations = loadTagRelations(resolveRefPath('tags_personality_relation.csv'))
  }
  return { bounds: cachedBounds, relations: cachedRelations }
}

/**
 * Clear cached reference data (useful for tests).
 */
export function clearReferenceDataCache(): void {
  cachedBounds = null
  cachedRelations = null
}
