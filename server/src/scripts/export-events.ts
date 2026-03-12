import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { exportEvents, EventExportRequestInput, normalizeEventExportOptions } from '../services/event-export.service';

export interface ExportCliArgs extends EventExportRequestInput {}

export const parseArgs = (argv: string[]): ExportCliArgs => {
  const getValue = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    if (index < 0 || index === argv.length - 1) {
      return undefined;
    }

    return argv[index + 1];
  };

  const getValues = (name: string): string[] => {
    const values: string[] = [];

    for (let index = 0; index < argv.length; index += 1) {
      if (argv[index] === name && index < argv.length - 1) {
        values.push(argv[index + 1]);
      }
    }

    return values;
  };

  return {
    teamId: getValue('--team-id') ?? '',
    from: getValue('--from') ?? '',
    to: getValue('--to') ?? '',
    format: getValue('--format') ?? 'csv',
    eventTypes: getValues('--event-type'),
  };
};

export const main = async (argv: string[] = process.argv.slice(2)): Promise<number> => {
  try {
    const args = parseArgs(argv);
    const request = normalizeEventExportOptions(args);

    console.log(`[START] Exporting events for team ${request.teamId} from ${request.from.toISOString()} to ${request.to.toISOString()} as ${request.format}`);
    const result = await exportEvents(args);

    console.log(`Exported ${result.rowCount} events`);
    console.log(`Output path: ${result.outputPath}`);
    console.log(`Format: ${result.format}`);

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown export failure';
    console.error(message);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main().then((code) => process.exit(code));
}