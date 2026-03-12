import 'dotenv/config';
import { prisma } from '../lib/prisma';

interface CliArgs {
  expectedMinCount?: number;
  expectedTotalCount?: number;
  requiredEventTypes: string[];
}

const parseArgs = (argv: string[]): CliArgs => {
  const getValue = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    if (index < 0 || index === argv.length - 1) {
      return undefined;
    }
    return argv[index + 1];
  };

  const parseOptionalNumber = (value: string | undefined, name: string): number | undefined => {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`Invalid numeric value for ${name}: ${value}`);
    }
    return parsed;
  };

  const requiredEventTypesRaw = getValue('--required-event-types');
  const requiredEventTypes = requiredEventTypesRaw
    ? requiredEventTypesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    expectedMinCount: parseOptionalNumber(getValue('--expected-min-count'), '--expected-min-count'),
    expectedTotalCount: parseOptionalNumber(getValue('--expected-total-count'), '--expected-total-count'),
    requiredEventTypes,
  };
};

const main = async (): Promise<number> => {
  try {
    const args = parseArgs(process.argv.slice(2));
    const count = await prisma.event.count();
    console.log(`events_row_count=${count}`);

    if (count <= 0) {
      console.error('[ERROR] Restore validation failed: events table contains zero rows.');
      return 1;
    }

    if (typeof args.expectedMinCount !== 'undefined' && count < args.expectedMinCount) {
      console.error(`[ERROR] Restore validation failed: expected at least ${args.expectedMinCount} rows, got ${count}.`);
      return 1;
    }

    if (typeof args.expectedTotalCount !== 'undefined' && count !== args.expectedTotalCount) {
      console.error(`[ERROR] Restore validation failed: expected exactly ${args.expectedTotalCount} rows, got ${count}.`);
      return 1;
    }

    if (args.requiredEventTypes.length > 0) {
      const requiredTypesCount = await prisma.event.groupBy({
        by: ['eventType'],
        where: {
          eventType: {
            in: args.requiredEventTypes,
          },
        },
        _count: {
          _all: true,
        },
      });

      const presentTypes = new Set(requiredTypesCount.map((item) => item.eventType));
      const missingTypes = args.requiredEventTypes.filter((eventType) => !presentTypes.has(eventType));

      if (missingTypes.length > 0) {
        console.error(`[ERROR] Restore validation failed: missing required event types: ${missingTypes.join(', ')}`);
        return 1;
      }
    }

    console.log('[OK] Restore validation passed.');
    return 0;
  } catch (error) {
    console.error('[ERROR] Restore validation failed:', error);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main().then((code) => process.exit(code));
}
