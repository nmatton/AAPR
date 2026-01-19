/**
 * Seed practices from JSON file
 * Reads practices_reference.json and imports into database
 */

import fs from 'fs/promises';
import path from 'path';
import { importPractices } from '../services/practice-import.service';
import { prisma } from '../lib/prisma';

const PRACTICES_JSON_PATH = path.join(__dirname, '../../../docs/raw_practices/practices_reference.json');

export async function seedPractices(): Promise<number> {
  console.log('[INFO] Starting practice seed script...');
  console.log(`[INFO] Reading from: ${PRACTICES_JSON_PATH}`);
  
  try {
    // Read JSON file
    const fileContent = await fs.readFile(PRACTICES_JSON_PATH, 'utf-8');
    const practicesData = JSON.parse(fileContent);
    
    if (!Array.isArray(practicesData)) {
      console.error('[ERROR] JSON file does not contain an array of practices');
      return 1;
    }
    
    console.log(`[INFO] Found ${practicesData.length} practices in JSON`);
    
    // Import practices
    const result = await importPractices(
      practicesData,
      'practices_reference.json',
      process.env.USER || 'system'
    );
    
    // Report results
    console.log('\n=== Import Summary ===');
    console.log(`✅ Imported: ${result.imported} practices`);
    console.log(`⏭️  Skipped: ${result.skipped} practices`);
    console.log(`❌ Errors: ${result.errors.length}`);
    console.log(`⏱️  Duration: ${result.duration_ms}ms`);
    
    if (result.errors.length > 0) {
      console.log('\n=== Errors ===');
      result.errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.practice}`);
        console.log(`   Code: ${err.code}`);
        console.log(`   Error: ${err.error}`);
        if (err.field) {
          console.log(`   Field: ${err.field}`);
        }
      });
    }
    
    // Verify import
    const practiceCount = await prisma.practice.count();
    const pillarCount = await prisma.pillar.count();
    const categoryCount = await prisma.category.count();
    
    console.log('\n=== Database State ===');
    console.log(`📚 Total Practices: ${practiceCount}`);
    console.log(`🎯 Total Pillars: ${pillarCount}`);
    console.log(`📂 Total Categories: ${categoryCount}`);
    
    if (result.errors.length > 0 && result.imported === 0) {
      console.error('\n[ERROR] No practices were imported. Exiting with error code 1');
      return 1;
    }

    console.log('\n[SUCCESS] Practice seed completed successfully');
    return 0;
    
  } catch (error) {
    console.error('[ERROR] Failed to seed practices:', error);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed when executed directly
if (require.main === module) {
  seedPractices().then((code) => process.exit(code));
}
