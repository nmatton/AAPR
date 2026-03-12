import 'dotenv/config';
import { purgeEventsBatch } from '../services/event-purge.service';

interface CliArgs {
  performedBy?: number;
  confirm?: string;
  from?: Date;
  to?: Date;
  teamId?: number;
  reason?: string;
}

const parseDate = (value: string | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed;
};

const parseArgs = (argv: string[]): CliArgs => {
  const getValue = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    if (index < 0 || index === argv.length - 1) {
      return undefined;
    }
    return argv[index + 1];
  };

  const performedByValue = getValue('--performed-by');
  const teamIdValue = getValue('--team-id');

  return {
    performedBy: performedByValue ? Number(performedByValue) : undefined,
    confirm: getValue('--confirm'),
    from: parseDate(getValue('--from')),
    to: parseDate(getValue('--to')),
    teamId: teamIdValue ? Number(teamIdValue) : undefined,
    reason: getValue('--reason'),
  };
};

const main = async (): Promise<number> => {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (!args.performedBy || Number.isNaN(args.performedBy)) {
      throw new Error('Missing required --performed-by <userId> argument');
    }

    if (!args.reason) {
      throw new Error('Missing required --reason "..." argument');
    }

    if (!args.confirm) {
      throw new Error('Missing required --confirm <token> argument');
    }

    if (process.env.ALLOW_EVENT_BATCH_PURGE !== 'true') {
      throw new Error('Batch purge is disabled. Set ALLOW_EVENT_BATCH_PURGE=true before running this script.');
    }

    const result = await purgeEventsBatch({
      performedBy: args.performedBy,
      confirmToken: args.confirm,
      from: args.from,
      to: args.to,
      teamId: args.teamId,
      reason: args.reason,
    });

    console.log('[OK] Event purge completed in batch mode');
    console.log(`Deleted rows: ${result.deletedCount}`);
    console.log(`Audit event id: ${result.auditEventId.toString()}`);
    console.log(`Scope: ${JSON.stringify(result.scope)}`);

    return 0;
  } catch (error) {
    console.error('[ERROR] Event purge failed:', error);
    return 1;
  }
};

if (require.main === module) {
  main().then((code) => process.exit(code));
}
