/**
 * Seed script for categories and pillars
 * Populates the 4 categories and 13 pillars from the converged agile taxonomy
 * Source of truth: docs/raw_practices/agile_pillars.md
 */

import { prisma } from '../lib/prisma';

const CATEGORIES = [
  {
    id: 'TECHNICAL_QUALITY',
    name: 'Technical Quality & Engineering Excellence',
    description: 'Focuses on the infrastructure, tooling, and strict coding standards that allow software to be built, tested, and modified safely.',
    displayOrder: 1,
  },
  {
    id: 'TEAM_CULTURE',
    name: 'Team Culture & Psychology',
    description: 'Evaluates the sociological and psychological factors enabling true self-organization, intrinsic motivation, and team resilience.',
    displayOrder: 2,
  },
  {
    id: 'PROCESS_EXECUTION',
    name: 'Process & Execution',
    description: 'Covers the tactical workflows, iterative cadences, and specific ceremonies that dictate how work is planned, tracked, and adjusted.',
    displayOrder: 3,
  },
  {
    id: 'PRODUCT_VALUE',
    name: 'Product Value & Customer Alignment',
    description: 'Evaluates the strategic alignment of daily engineering work with actual market needs, ensuring the delivered software maximizes return on investment.',
    displayOrder: 4,
  },
];

const PILLARS = [
  // TECHNICAL_QUALITY (4 pillars)
  { name: 'Code Quality & Simple Design', categoryId: 'TECHNICAL_QUALITY', description: 'The capability to maintain clean, understandable, and strictly standardized codebases.' },
  { name: 'Automation & Continuous Integration', categoryId: 'TECHNICAL_QUALITY', description: 'The capability to merge, test, and validate development work frequently to prevent integration bottlenecks.' },
  { name: 'Technical Debt Management', categoryId: 'TECHNICAL_QUALITY', description: 'The capability to continuously improve the internal architecture of the system without altering its external behavior.' },
  { name: 'Technical Collective Ownership', categoryId: 'TECHNICAL_QUALITY', description: 'The shared responsibility and understanding of the technical architecture across the entire team, avoiding single points of failure.' },

  // TEAM_CULTURE (4 pillars)
  { name: 'Psychological Safety & Core Values', categoryId: 'TEAM_CULTURE', description: 'The establishment of a high-trust climate allowing for transparency, humility, courage, and the right to fail without blame.' },
  { name: 'Self-Organization & Autonomy', categoryId: 'TEAM_CULTURE', description: "The team's capability to make decentralized decisions, manage their own tasks, and organize without top-down micro-management." },
  { name: 'Cross-Functionality & Shared Skills', categoryId: 'TEAM_CULTURE', description: "The team's capability to possess all necessary skills end-to-end to deliver value without relying on external dependencies." },
  { name: 'Sustainable Pace', categoryId: 'TEAM_CULTURE', description: 'The capability to maintain a steady, predictable rhythm of work indefinitely, actively preventing developer burnout and managing cognitive load.' },

  // PROCESS_EXECUTION (3 pillars)
  { name: 'Flow & Delivery Cadence', categoryId: 'PROCESS_EXECUTION', description: 'The capability to deliver working software increments rapidly, regularly, and with maximal workflow simplicity.' },
  { name: 'Inspection & Adaptation', categoryId: 'PROCESS_EXECUTION', description: 'The capability to formally evaluate team workflows and correct them regularly, establishing a continuous learning loop.' },
  { name: 'Work Transparency & Synchronization', categoryId: 'PROCESS_EXECUTION', description: 'The capability to make all work items, progress, and tactical blockers highly visible to everyone involved.' },

  // PRODUCT_VALUE (2 pillars)
  { name: 'Customer Involvement & Active Feedback', categoryId: 'PRODUCT_VALUE', description: 'The capability to continuously collaborate with stakeholders, users, or clients, gathering and processing their feedback.' },
  { name: 'Value-Driven Prioritization', categoryId: 'PRODUCT_VALUE', description: 'The capability to define and pivot the product\'s direction based on user impact, ensuring the most valuable features are delivered first.' },
];

export async function seedCategoriesAndPillars(): Promise<void> {
  console.log('[INFO] Starting categories and pillars seed...');
  
  try {
    // Controlled reset: clear FK-dependent data before replacing taxonomy
    console.log('[INFO] Clearing legacy taxonomy-dependent data...');
    await prisma.practicePillar.deleteMany({});
    await prisma.practice.deleteMany({});
    await prisma.pillar.deleteMany({});
    await prisma.category.deleteMany({});
    console.log('[SUCCESS] Legacy taxonomy data cleared');

    // Seed categories
    console.log('[INFO] Seeding categories...');
    for (const category of CATEGORIES) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: category,
        create: category,
      });
    }
    console.log(`[SUCCESS] Seeded ${CATEGORIES.length} categories`);
    
    // Seed pillars
    console.log('[INFO] Seeding pillars...');
    for (const pillar of PILLARS) {
      await prisma.pillar.upsert({
        where: {
          name_categoryId: {
            name: pillar.name,
            categoryId: pillar.categoryId,
          },
        },
        update: pillar,
        create: pillar,
      });
    }
    console.log(`[SUCCESS] Seeded ${PILLARS.length} pillars`);
    
    console.log('[SUCCESS] Categories and pillars seed completed');
  } catch (error) {
    console.error('[ERROR] Failed to seed categories and pillars:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed when executed directly
if (require.main === module) {
  seedCategoriesAndPillars();
}
