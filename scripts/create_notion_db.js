const DEFAULT_PLATFORM_DB_NAME = 'Platform DB';
const DEFAULT_TEAM_DB_NAME = 'Team DB';

function getValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || index === argv.length - 1) {
    return undefined;
  }

  return argv[index + 1];
}

function printUsage() {
  console.log(`Usage:
  node scripts/create_notion_db.js --notion-token <token> --parent-page-id <pageId> [--platform-db-name <name>] [--team-db-name <name>]

Options:
  --notion-token      Notion integration token
  --parent-page-id    Parent page that will contain both databases
  --platform-db-name  Optional custom name for the platform database
  --team-db-name      Optional custom name for the team database

Environment fallbacks:
  NOTION_API_TOKEN
  NOTION_PARENT_PAGE_ID
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { help: true };
  }

  const notionToken = getValue(argv, '--notion-token') || process.env.NOTION_API_TOKEN;
  const parentPageId = getValue(argv, '--parent-page-id') || process.env.NOTION_PARENT_PAGE_ID;
  const platformDbName = getValue(argv, '--platform-db-name') || DEFAULT_PLATFORM_DB_NAME;
  const teamDbName = getValue(argv, '--team-db-name') || DEFAULT_TEAM_DB_NAME;

  if (!notionToken) {
    throw new Error('Missing required --notion-token <token> argument or NOTION_API_TOKEN environment variable');
  }

  if (!parentPageId) {
    throw new Error('Missing required --parent-page-id <pageId> argument or NOTION_PARENT_PAGE_ID environment variable');
  }

  return {
    help: false,
    notionToken,
    parentPageId,
    platformDbName,
    teamDbName,
  };
}

/**
 * Helper function to map an array of column names to Notion's number property schema
 */
function generateNumberProperties(columns) {
  return columns.reduce((acc, col) => {
    acc[col] = { number: {} };
    return acc;
  }, {});
}

async function createPlatformDatabase(notion, parentPageId, databaseName) {
  const numberColumns = [
    "Registered Users", "Active Users", "Teams Total", "Active Teams",
    "Issues Total", "Team Practices Total", "Comments Total", "Events Total",
    "Issues Created In Window", "Issues Open", "Issues In Progress",
    "Issues Adaptation In Progress", "Issues Evaluated", "Issues Done",
    "Flow Open To In Progress", "Flow In Progress To Adaptation In Progress",
    "Flow Adaptation In Progress To Evaluated", "Flow Evaluated To Done",
    "Avg Practices Per Team", "Custom Practice", "Practice Edited",
    "Method Scrum", "Method Kanban", "Method XP", "Method Lean",
    "Method Scaled Agile", "Method Product Management", 
    "Method Design Thinking and UX", "Method Project Management", 
    "Method Agile", "Method Facilitation and Workshops"
  ];

  console.log("Creating Platform DB...");
  const response = await notion.databases.create({
    parent: {
      type: "page_id",
      page_id: parentPageId
    },
    title: [{ text: { content: databaseName } }],
    initial_data_source: {
      properties: {
        "Name": { title: {} },
        "Snapshot Generated At": { date: {} },
        "Window Label": { select: {} },
        "Window From": { date: {} },
        "Window To": { date: {} },
        "Top Adopted Practices": { rich_text: {} },
        ...generateNumberProperties(numberColumns)
      }
    }
  });
  
  console.log(`✅ Platform DB created! ID: ${response.id}`);
  return response.id;
}

async function createTeamDatabase(notion, parentPageId, databaseName) {
  const numberColumns = [
    "Team ID", "Members Count", "Issues Count", "Issues Open", 
    "Issues In Progress", "Issues Adaptation In Progress", "Issues Evaluated", 
    "Issues Done", "Practices Count", "Practices Custom Practice", 
    "Practices Practice Edited", "Coverage Covered Pillars Count", 
    "Coverage Covered Categories Count", "Coverage Pct", 
    "Category Technical Quality Practices", "Category Team Culture Practices", 
    "Category Process Execution Practices", "Category Product Value Practices",
    "Subpillar 1.1", "Subpillar 1.2", "Subpillar 1.3", "Subpillar 1.4",
    "Subpillar 2.1", "Subpillar 2.2", "Subpillar 2.3", "Subpillar 2.4",
    "Subpillar 3.1", "Subpillar 3.2", "Subpillar 3.3", 
    "Subpillar 4.1", "Subpillar 4.2"
  ];

  console.log("Creating Team DB...");
  const response = await notion.databases.create({
    parent: {
      type: "page_id",
      page_id: parentPageId
    },
    title: [{ text: { content: databaseName } }],
    initial_data_source: {
      properties: {
        "Name": { title: {} },
        "Snapshot Generated At": { date: {} },
        "Window Label": { select: {} },
        "Window From": { date: {} },
        "Window To": { date: {} },
        "Team Name": { rich_text: {} },
        "Last Activity At": { date: {} },
        ...generateNumberProperties(numberColumns)
      }
    }
  });

  console.log(`✅ Team DB created! ID: ${response.id}`);
  return response.id;
}

async function main(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);

    if (args.help) {
      printUsage();
      return 0;
    }

    const { Client } = await import('@notionhq/client');
    const notion = new Client({ auth: args.notionToken });

    const platformDbId = await createPlatformDatabase(
      notion,
      args.parentPageId,
      args.platformDbName
    );
    const teamDbId = await createTeamDatabase(
      notion,
      args.parentPageId,
      args.teamDbName
    );

    console.log('');
    console.log('Set these values in your instance env file:');
    console.log(`NOTION_PLATFORM_STATS_DATABASE_ID=${platformDbId}`);
    console.log(`NOTION_TEAM_STATS_DATABASE_ID=${teamDbId}`);
    return 0;
  } catch (error) {
    console.error('Error creating databases:', error.body || error.message || error);
    return 1;
  }
}

if (require.main === module) {
  main().then((code) => process.exit(code));
}