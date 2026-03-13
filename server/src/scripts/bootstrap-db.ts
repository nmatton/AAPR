/**
 * Bootstrap database content at container startup.
 * Runs full seed only when the practice catalog is empty.
 */

import { prisma } from '../lib/prisma';
import { seedAll } from './seed-all';

export async function bootstrapDb(): Promise<number> {
  try {
    const practiceCount = await prisma.practice.count();

    if (practiceCount > 0) {
      console.log(`[INFO] Practice catalog already initialized (${practiceCount} practices). Skipping seed.`);
      return 0;
    }

    console.log('[INFO] Practice catalog is empty. Running initial seed...');
    return await seedAll();
  } catch (error) {
    console.error('[ERROR] Database bootstrap failed:', error);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  bootstrapDb().then((code) => process.exit(code));
}
