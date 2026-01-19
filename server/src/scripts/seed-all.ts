/**
 * Seed all static reference data and practices
 * Runs categories/pillars first, then practices import
 */

import { seedCategoriesAndPillars } from './seed-categories-pillars';
import { seedPractices } from './seed-practices';

async function seedAll(): Promise<number> {
  try {
    await seedCategoriesAndPillars();
    const practicesExitCode = await seedPractices();
    return practicesExitCode;
  } catch (error) {
    console.error('[ERROR] Seed-all failed:', error);
    return 1;
  }
}

if (require.main === module) {
  seedAll().then((code) => process.exit(code));
}
