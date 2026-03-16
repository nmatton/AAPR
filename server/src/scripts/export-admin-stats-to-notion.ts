import 'dotenv/config';

type WindowLabel = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'all_time' | 'custom';

type StatusCounts = {
  open: number;
  in_progress: number;
  adaptation_in_progress: number;
  evaluated: number;
  done: number;
};

type MethodDistribution = {
  Scrum: number;
  Kanban: number;
  XP: number;
  Lean: number;
  'Scaled Agile': number;
  'Product Management': number;
  'Design Thinking & UX': number;
  'Project Management': number;
  Agile: number;
  'Facilitation & Workshops': number;
};

type TeamCoveragePillars = {
  'Technical Quality & Engineering Excellence': {
    practices: number;
    subpillars: {
      '1.1': { name: string; practices: number };
      '1.2': { name: string; practices: number };
      '1.3': { name: string; practices: number };
      '1.4': { name: string; practices: number };
    };
  };
  'Team Culture & Psychology': {
    practices: number;
    subpillars: {
      '2.1': { name: string; practices: number };
      '2.2': { name: string; practices: number };
      '2.3': { name: string; practices: number };
      '2.4': { name: string; practices: number };
    };
  };
  'Process & Execution': {
    practices: number;
    subpillars: {
      '3.1': { name: string; practices: number };
      '3.2': { name: string; practices: number };
      '3.3': { name: string; practices: number };
    };
  };
  'Product Value & Customer Alignment': {
    practices: number;
    subpillars: {
      '4.1': { name: string; practices: number };
      '4.2': { name: string; practices: number };
    };
  };
};

type AdminStatsResponse = {
  meta: {
    generatedAt: string;
    window: {
      from: string;
      to: string;
      label: WindowLabel;
    };
    aggregationLevel: 'platform';
    privacy: {
      containsPII: false;
      granularity: 'aggregated_only';
    };
    version: string;
  };
  platform: {
    overview: {
      registeredUsers: number;
      activeUsers: number;
      teamsTotal: number;
      activeTeams: number;
      issuesTotal: number;
      teamPracticesTotal: number;
      commentsTotal: number;
      eventsTotal: number;
    };
    issues: {
      createdInWindow: number;
      byStatus: StatusCounts;
      flow: {
        open_to_in_progress_rate: number;
        in_progress_to_adaptation_in_progress_rate: number;
        adaptation_in_progress_to_evaluated_rate: number;
        evaluated_to_done_rate: number;
      };
    };
    practices: {
      avgPracticesPerTeam: number;
      customPractice: number;
      practiceEdited: number;
      topAdoptedPractices: Array<{
        practiceId: number;
        title: string;
        teamsUsing: number;
      }>;
      methodDistribution: MethodDistribution;
    };
  };
  teams: Array<{
    teamId: number;
    teamName: string;
    membersCount: number;
    issuesCount: number;
    issuesByStatus: StatusCounts;
    lastActivityAt: string | null;
    practices: {
      count: number;
      customPractice: number;
      practiceEdited: number;
      coverage: {
        coveredPillarsCount: number;
        coveredCategoriesCount: number;
        coveragePct: number;
        pillars: TeamCoveragePillars;
      };
    };
  }>;
};

type NotionPropertyType =
  | 'title'
  | 'number'
  | 'rich_text'
  | 'date'
  | 'select'
  | 'status'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'people'
  | 'files'
  | 'relation'
  | 'formula'
  | 'multi_select'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

type NotionDatabase = {
  id: string;
  properties: Record<
    string,
    {
      id: string;
      name: string;
      type: NotionPropertyType;
    }
  >;
};

type NotionPropertyValue =
  | { title: Array<{ type: 'text'; text: { content: string } }> }
  | { number: number | null }
  | { rich_text: Array<{ type: 'text'; text: { content: string } }> }
  | { date: { start: string } | null }
  | { select: { name: string } | null };

type NotionPagePayload = {
  parent: { database_id: string };
  properties: Record<string, NotionPropertyValue>;
};

const PLATFORM_DB_REQUIRED_COLUMNS = [
  { name: 'Name', type: 'title' as const },
  { name: 'Snapshot Generated At', type: 'date' as const },
  { name: 'Window Label', type: 'select' as const },
  { name: 'Window From', type: 'date' as const },
  { name: 'Window To', type: 'date' as const },
  { name: 'Registered Users', type: 'number' as const },
  { name: 'Active Users', type: 'number' as const },
  { name: 'Teams Total', type: 'number' as const },
  { name: 'Active Teams', type: 'number' as const },
  { name: 'Issues Total', type: 'number' as const },
  { name: 'Team Practices Total', type: 'number' as const },
  { name: 'Comments Total', type: 'number' as const },
  { name: 'Events Total', type: 'number' as const },
  { name: 'Issues Created In Window', type: 'number' as const },
  { name: 'Issues Open', type: 'number' as const },
  { name: 'Issues In Progress', type: 'number' as const },
  { name: 'Issues Adaptation In Progress', type: 'number' as const },
  { name: 'Issues Evaluated', type: 'number' as const },
  { name: 'Issues Done', type: 'number' as const },
  { name: 'Flow Open To In Progress', type: 'number' as const },
  { name: 'Flow In Progress To Adaptation In Progress', type: 'number' as const },
  { name: 'Flow Adaptation In Progress To Evaluated', type: 'number' as const },
  { name: 'Flow Evaluated To Done', type: 'number' as const },
  { name: 'Avg Practices Per Team', type: 'number' as const },
  { name: 'Custom Practice', type: 'number' as const },
  { name: 'Practice Edited', type: 'number' as const },
  { name: 'Top Adopted Practices', type: 'rich_text' as const },
  { name: 'Method Scrum', type: 'number' as const },
  { name: 'Method Kanban', type: 'number' as const },
  { name: 'Method XP', type: 'number' as const },
  { name: 'Method Lean', type: 'number' as const },
  { name: 'Method Scaled Agile', type: 'number' as const },
  { name: 'Method Product Management', type: 'number' as const },
  { name: 'Method Design Thinking and UX', type: 'number' as const },
  { name: 'Method Project Management', type: 'number' as const },
  { name: 'Method Agile', type: 'number' as const },
  { name: 'Method Facilitation and Workshops', type: 'number' as const },
];

const TEAM_DB_REQUIRED_COLUMNS = [
  { name: 'Name', type: 'title' as const },
  { name: 'Snapshot Generated At', type: 'date' as const },
  { name: 'Window Label', type: 'select' as const },
  { name: 'Window From', type: 'date' as const },
  { name: 'Window To', type: 'date' as const },
  { name: 'Team ID', type: 'number' as const },
  { name: 'Team Name', type: 'rich_text' as const },
  { name: 'Members Count', type: 'number' as const },
  { name: 'Issues Count', type: 'number' as const },
  { name: 'Issues Open', type: 'number' as const },
  { name: 'Issues In Progress', type: 'number' as const },
  { name: 'Issues Adaptation In Progress', type: 'number' as const },
  { name: 'Issues Evaluated', type: 'number' as const },
  { name: 'Issues Done', type: 'number' as const },
  { name: 'Last Activity At', type: 'date' as const },
  { name: 'Practices Count', type: 'number' as const },
  { name: 'Practices Custom Practice', type: 'number' as const },
  { name: 'Practices Practice Edited', type: 'number' as const },
  { name: 'Coverage Covered Pillars Count', type: 'number' as const },
  { name: 'Coverage Covered Categories Count', type: 'number' as const },
  { name: 'Coverage Pct', type: 'number' as const },
  { name: 'Category Technical Quality Practices', type: 'number' as const },
  { name: 'Category Team Culture Practices', type: 'number' as const },
  { name: 'Category Process Execution Practices', type: 'number' as const },
  { name: 'Category Product Value Practices', type: 'number' as const },
  { name: 'Subpillar 1.1', type: 'number' as const },
  { name: 'Subpillar 1.2', type: 'number' as const },
  { name: 'Subpillar 1.3', type: 'number' as const },
  { name: 'Subpillar 1.4', type: 'number' as const },
  { name: 'Subpillar 2.1', type: 'number' as const },
  { name: 'Subpillar 2.2', type: 'number' as const },
  { name: 'Subpillar 2.3', type: 'number' as const },
  { name: 'Subpillar 2.4', type: 'number' as const },
  { name: 'Subpillar 3.1', type: 'number' as const },
  { name: 'Subpillar 3.2', type: 'number' as const },
  { name: 'Subpillar 3.3', type: 'number' as const },
  { name: 'Subpillar 4.1', type: 'number' as const },
  { name: 'Subpillar 4.2', type: 'number' as const },
];

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const asText = (value: string): Array<{ type: 'text'; text: { content: string } }> => [
  {
    type: 'text',
    text: { content: value },
  },
];

const numberProp = (value: number | null): NotionPropertyValue => ({ number: value });
const dateProp = (value: string | null): NotionPropertyValue => ({ date: value ? { start: value } : null });
const titleProp = (value: string): NotionPropertyValue => ({ title: asText(value) });
const richTextProp = (value: string): NotionPropertyValue => ({ rich_text: asText(value) });
const selectProp = (value: string): NotionPropertyValue => ({ select: { name: value } });

const getArgValue = (argv: string[], flag: string): string | undefined => {
  const idx = argv.indexOf(flag);
  if (idx < 0 || idx >= argv.length - 1) {
    return undefined;
  }

  return argv[idx + 1];
};

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const notionRequest = async <T>(
  token: string,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<T> => {
  const response = await fetch(`${NOTION_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Notion API ${method} ${path} failed (${response.status}): ${details}`);
  }

  return (await response.json()) as T;
};

const fetchDatabase = async (token: string, databaseId: string): Promise<NotionDatabase> =>
  notionRequest<NotionDatabase>(token, 'GET', `/databases/${databaseId}`);

const createPage = async (token: string, payload: NotionPagePayload): Promise<void> => {
  await notionRequest<Record<string, unknown>>(token, 'POST', '/pages', payload);
};

const validateDatabaseSchema = (
  database: NotionDatabase,
  expectedColumns: ReadonlyArray<{ name: string; type: NotionPropertyType }>,
  databaseLabel: string
): void => {
  const missing: string[] = [];
  const wrongType: string[] = [];

  for (const expected of expectedColumns) {
    const actual = database.properties[expected.name];
    if (!actual) {
      missing.push(expected.name);
      continue;
    }

    if (actual.type !== expected.type) {
      wrongType.push(`${expected.name} (expected ${expected.type}, got ${actual.type})`);
    }
  }

  if (missing.length > 0 || wrongType.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(`Missing columns: ${missing.join(', ')}`);
    }
    if (wrongType.length > 0) {
      parts.push(`Wrong column types: ${wrongType.join(', ')}`);
    }

    throw new Error(`Schema mismatch in ${databaseLabel} Notion DB. ${parts.join(' | ')}`);
  }
};

const resolveLocalBackendPort = (): number => {
  const rawPort = process.env.PORT?.trim();
  if (!rawPort) {
    return 3000;
  }

  const parsedPort = Number(rawPort);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535 when provided');
  }

  return parsedPort;
};

const buildAdminStatsUrl = (label?: string, from?: string, to?: string): string => {
  const backendPort = resolveLocalBackendPort();
  const url = new URL(`http://localhost:${backendPort}/api/v1/admin/stats`);

  if (label) {
    url.searchParams.set('label', label);
  }
  if (from) {
    url.searchParams.set('from', from);
  }
  if (to) {
    url.searchParams.set('to', to);
  }

  return url.toString();
};

const formatError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Unknown failure while exporting admin stats to Notion.';
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause || typeof cause !== 'object') {
    return error.message;
  }

  const causeRecord = cause as Record<string, unknown>;
  const code = typeof causeRecord.code === 'string' ? causeRecord.code : undefined;
  const address = typeof causeRecord.address === 'string' ? causeRecord.address : undefined;
  const port = typeof causeRecord.port === 'number' ? causeRecord.port : undefined;
  const details = [code, address, port !== undefined ? String(port) : undefined].filter(Boolean).join(' ');

  if (!details) {
    return error.message;
  }

  return `${error.message} (${details})`;
};

const fetchAdminStats = async (
  adminApiKey: string,
  label?: string,
  from?: string,
  to?: string
): Promise<AdminStatsResponse> => {
  const url = buildAdminStatsUrl(label, from, to);

  const response = await fetch(url, {
    headers: {
      'X-API-KEY': adminApiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Admin stats request failed (${response.status}) on ${url}: ${details}`);
  }

  return (await response.json()) as AdminStatsResponse;
};

const formatTopAdoptedPractices = (
  topAdoptedPractices: AdminStatsResponse['platform']['practices']['topAdoptedPractices']
): string => {
  if (topAdoptedPractices.length === 0) {
    return '[]';
  }

  return JSON.stringify(topAdoptedPractices);
};

const buildPlatformPagePayload = (
  dbId: string,
  stats: AdminStatsResponse
): NotionPagePayload => {
  const generatedAtDate = stats.meta.generatedAt.slice(0, 10);

  return {
    parent: { database_id: dbId },
    properties: {
      Name: titleProp(`Platform Snapshot ${stats.meta.window.label} ${generatedAtDate}`),
      'Snapshot Generated At': dateProp(stats.meta.generatedAt),
      'Window Label': selectProp(stats.meta.window.label),
      'Window From': dateProp(stats.meta.window.from),
      'Window To': dateProp(stats.meta.window.to),
      'Registered Users': numberProp(stats.platform.overview.registeredUsers),
      'Active Users': numberProp(stats.platform.overview.activeUsers),
      'Teams Total': numberProp(stats.platform.overview.teamsTotal),
      'Active Teams': numberProp(stats.platform.overview.activeTeams),
      'Issues Total': numberProp(stats.platform.overview.issuesTotal),
      'Team Practices Total': numberProp(stats.platform.overview.teamPracticesTotal),
      'Comments Total': numberProp(stats.platform.overview.commentsTotal),
      'Events Total': numberProp(stats.platform.overview.eventsTotal),
      'Issues Created In Window': numberProp(stats.platform.issues.createdInWindow),
      'Issues Open': numberProp(stats.platform.issues.byStatus.open),
      'Issues In Progress': numberProp(stats.platform.issues.byStatus.in_progress),
      'Issues Adaptation In Progress': numberProp(stats.platform.issues.byStatus.adaptation_in_progress),
      'Issues Evaluated': numberProp(stats.platform.issues.byStatus.evaluated),
      'Issues Done': numberProp(stats.platform.issues.byStatus.done),
      'Flow Open To In Progress': numberProp(stats.platform.issues.flow.open_to_in_progress_rate),
      'Flow In Progress To Adaptation In Progress': numberProp(
        stats.platform.issues.flow.in_progress_to_adaptation_in_progress_rate
      ),
      'Flow Adaptation In Progress To Evaluated': numberProp(
        stats.platform.issues.flow.adaptation_in_progress_to_evaluated_rate
      ),
      'Flow Evaluated To Done': numberProp(stats.platform.issues.flow.evaluated_to_done_rate),
      'Avg Practices Per Team': numberProp(stats.platform.practices.avgPracticesPerTeam),
      'Custom Practice': numberProp(stats.platform.practices.customPractice),
      'Practice Edited': numberProp(stats.platform.practices.practiceEdited),
      'Top Adopted Practices': richTextProp(formatTopAdoptedPractices(stats.platform.practices.topAdoptedPractices)),
      'Method Scrum': numberProp(stats.platform.practices.methodDistribution.Scrum),
      'Method Kanban': numberProp(stats.platform.practices.methodDistribution.Kanban),
      'Method XP': numberProp(stats.platform.practices.methodDistribution.XP),
      'Method Lean': numberProp(stats.platform.practices.methodDistribution.Lean),
      'Method Scaled Agile': numberProp(stats.platform.practices.methodDistribution['Scaled Agile']),
      'Method Product Management': numberProp(stats.platform.practices.methodDistribution['Product Management']),
      'Method Design Thinking and UX': numberProp(stats.platform.practices.methodDistribution['Design Thinking & UX']),
      'Method Project Management': numberProp(stats.platform.practices.methodDistribution['Project Management']),
      'Method Agile': numberProp(stats.platform.practices.methodDistribution.Agile),
      'Method Facilitation and Workshops': numberProp(
        stats.platform.practices.methodDistribution['Facilitation & Workshops']
      ),
    },
  };
};

const buildTeamPagePayload = (
  dbId: string,
  stats: AdminStatsResponse,
  team: AdminStatsResponse['teams'][number]
): NotionPagePayload => {
  const generatedAtDate = stats.meta.generatedAt.slice(0, 10);
  const coverage = team.practices.coverage;

  return {
    parent: { database_id: dbId },
    properties: {
      Name: titleProp(`Team Snapshot ${team.teamName} ${stats.meta.window.label} ${generatedAtDate}`),
      'Snapshot Generated At': dateProp(stats.meta.generatedAt),
      'Window Label': selectProp(stats.meta.window.label),
      'Window From': dateProp(stats.meta.window.from),
      'Window To': dateProp(stats.meta.window.to),
      'Team ID': numberProp(team.teamId),
      'Team Name': richTextProp(team.teamName),
      'Members Count': numberProp(team.membersCount),
      'Issues Count': numberProp(team.issuesCount),
      'Issues Open': numberProp(team.issuesByStatus.open),
      'Issues In Progress': numberProp(team.issuesByStatus.in_progress),
      'Issues Adaptation In Progress': numberProp(team.issuesByStatus.adaptation_in_progress),
      'Issues Evaluated': numberProp(team.issuesByStatus.evaluated),
      'Issues Done': numberProp(team.issuesByStatus.done),
      'Last Activity At': dateProp(team.lastActivityAt),
      'Practices Count': numberProp(team.practices.count),
      'Practices Custom Practice': numberProp(team.practices.customPractice),
      'Practices Practice Edited': numberProp(team.practices.practiceEdited),
      'Coverage Covered Pillars Count': numberProp(coverage.coveredPillarsCount),
      'Coverage Covered Categories Count': numberProp(coverage.coveredCategoriesCount),
      'Coverage Pct': numberProp(coverage.coveragePct),
      'Category Technical Quality Practices': numberProp(
        coverage.pillars['Technical Quality & Engineering Excellence'].practices
      ),
      'Category Team Culture Practices': numberProp(coverage.pillars['Team Culture & Psychology'].practices),
      'Category Process Execution Practices': numberProp(coverage.pillars['Process & Execution'].practices),
      'Category Product Value Practices': numberProp(
        coverage.pillars['Product Value & Customer Alignment'].practices
      ),
      'Subpillar 1.1': numberProp(
        coverage.pillars['Technical Quality & Engineering Excellence'].subpillars['1.1'].practices
      ),
      'Subpillar 1.2': numberProp(
        coverage.pillars['Technical Quality & Engineering Excellence'].subpillars['1.2'].practices
      ),
      'Subpillar 1.3': numberProp(
        coverage.pillars['Technical Quality & Engineering Excellence'].subpillars['1.3'].practices
      ),
      'Subpillar 1.4': numberProp(
        coverage.pillars['Technical Quality & Engineering Excellence'].subpillars['1.4'].practices
      ),
      'Subpillar 2.1': numberProp(coverage.pillars['Team Culture & Psychology'].subpillars['2.1'].practices),
      'Subpillar 2.2': numberProp(coverage.pillars['Team Culture & Psychology'].subpillars['2.2'].practices),
      'Subpillar 2.3': numberProp(coverage.pillars['Team Culture & Psychology'].subpillars['2.3'].practices),
      'Subpillar 2.4': numberProp(coverage.pillars['Team Culture & Psychology'].subpillars['2.4'].practices),
      'Subpillar 3.1': numberProp(coverage.pillars['Process & Execution'].subpillars['3.1'].practices),
      'Subpillar 3.2': numberProp(coverage.pillars['Process & Execution'].subpillars['3.2'].practices),
      'Subpillar 3.3': numberProp(coverage.pillars['Process & Execution'].subpillars['3.3'].practices),
      'Subpillar 4.1': numberProp(
        coverage.pillars['Product Value & Customer Alignment'].subpillars['4.1'].practices
      ),
      'Subpillar 4.2': numberProp(
        coverage.pillars['Product Value & Customer Alignment'].subpillars['4.2'].practices
      ),
    },
  };
};

export const main = async (argv: string[] = process.argv.slice(2)): Promise<number> => {
  try {
    const notionToken = requireEnv('NOTION_API_TOKEN');
    const notionPlatformDbId = requireEnv('NOTION_PLATFORM_STATS_DATABASE_ID');
    const notionTeamDbId = requireEnv('NOTION_TEAM_STATS_DATABASE_ID');
    const adminApiKey = requireEnv('ADMIN_API_KEY');

    const label = getArgValue(argv, '--label');
    const from = getArgValue(argv, '--from');
    const to = getArgValue(argv, '--to');

    console.log('[START] Exporting admin stats to Notion...');
    const stats = await fetchAdminStats(adminApiKey, label, from, to);

    const [platformDb, teamDb] = await Promise.all([
      fetchDatabase(notionToken, notionPlatformDbId),
      fetchDatabase(notionToken, notionTeamDbId),
    ]);

    validateDatabaseSchema(platformDb, PLATFORM_DB_REQUIRED_COLUMNS, 'platform');
    validateDatabaseSchema(teamDb, TEAM_DB_REQUIRED_COLUMNS, 'team');

    await createPage(notionToken, buildPlatformPagePayload(notionPlatformDbId, stats));

    for (const team of stats.teams) {
      await createPage(notionToken, buildTeamPagePayload(notionTeamDbId, stats, team));
    }

    console.log(
      `[DONE] Notion export completed. Created 1 platform page and ${stats.teams.length} team pages for window ${stats.meta.window.label}.`
    );

    return 0;
  } catch (error) {
    const message = formatError(error);
    console.error(message);
    return 1;
  }
};

if (require.main === module) {
  main().then((code) => process.exit(code));
}
