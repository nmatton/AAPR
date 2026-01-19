/**
 * Seed script for categories and pillars
 * Populates the 5 categories and 19 pillars from APR framework
 */

import { prisma } from '../lib/prisma';

const CATEGORIES = [
  {
    id: 'VALEURS_HUMAINES',
    name: 'VALEURS HUMAINES',
    description: 'Human values and interpersonal dynamics',
    displayOrder: 1,
  },
  {
    id: 'FEEDBACK_APPRENTISSAGE',
    name: 'FEEDBACK & APPRENTISSAGE',
    description: 'Feedback loops and continuous learning',
    displayOrder: 2,
  },
  {
    id: 'EXCELLENCE_TECHNIQUE',
    name: 'EXCELLENCE TECHNIQUE',
    description: 'Technical practices and code quality',
    displayOrder: 3,
  },
  {
    id: 'ORGANISATION_AUTONOMIE',
    name: 'ORGANISATION & AUTONOMIE',
    description: 'Team organization and self-management',
    displayOrder: 4,
  },
  {
    id: 'FLUX_RAPIDITE',
    name: 'FLUX & RAPIDITÉ',
    description: 'Flow and delivery speed',
    displayOrder: 5,
  },
];

const PILLARS = [
  // VALEURS HUMAINES (4 pillars)
  { name: 'Communication', categoryId: 'VALEURS_HUMAINES', description: 'Effective communication within and across teams' },
  { name: 'Courage', categoryId: 'VALEURS_HUMAINES', description: 'Courage to take risks and face challenges' },
  { name: 'Humility', categoryId: 'VALEURS_HUMAINES', description: 'Humility to learn from mistakes and others' },
  { name: 'Transparency', categoryId: 'VALEURS_HUMAINES', description: 'Transparency in work and decision-making' },
  
  // FEEDBACK & APPRENTISSAGE (4 pillars)
  { name: 'Feedback', categoryId: 'FEEDBACK_APPRENTISSAGE', description: 'Continuous feedback loops' },
  { name: 'Inspection', categoryId: 'FEEDBACK_APPRENTISSAGE', description: 'Regular inspection of work and processes' },
  { name: 'Adaptation', categoryId: 'FEEDBACK_APPRENTISSAGE', description: 'Adapting based on feedback and inspection' },
  { name: 'Sustainable Pace', categoryId: 'FEEDBACK_APPRENTISSAGE', description: 'Maintaining sustainable work pace' },
  
  // EXCELLENCE TECHNIQUE (4 pillars)
  { name: 'Simple Design', categoryId: 'EXCELLENCE_TECHNIQUE', description: 'Simplicity in design and architecture' },
  { name: 'Coding Standards', categoryId: 'EXCELLENCE_TECHNIQUE', description: 'Consistent coding standards and conventions' },
  { name: 'Collective Code Ownership', categoryId: 'EXCELLENCE_TECHNIQUE', description: 'Shared ownership of codebase' },
  { name: 'TDD (Test First)', categoryId: 'EXCELLENCE_TECHNIQUE', description: 'Test-driven development practices' },
  
  // ORGANISATION & AUTONOMIE (4 pillars)
  { name: 'Self-Organization', categoryId: 'ORGANISATION_AUTONOMIE', description: 'Team self-organization and autonomy' },
  { name: 'Cross-Functional Teams', categoryId: 'ORGANISATION_AUTONOMIE', description: 'Cross-functional team composition' },
  { name: 'Active Stakeholder Participation', categoryId: 'ORGANISATION_AUTONOMIE', description: 'Active stakeholder engagement' },
  { name: 'Continuous Integration', categoryId: 'ORGANISATION_AUTONOMIE', description: 'Continuous integration practices' },
  
  // FLUX & RAPIDITÉ (3 pillars)
  { name: 'Simplicity', categoryId: 'FLUX_RAPIDITE', description: 'Simplicity in processes and workflows' },
  { name: 'Short Releases', categoryId: 'FLUX_RAPIDITE', description: 'Short and frequent releases' },
  { name: 'Refactoring', categoryId: 'FLUX_RAPIDITE', description: 'Regular refactoring for code quality' },
];

export async function seedCategoriesAndPillars(): Promise<void> {
  console.log('[INFO] Starting categories and pillars seed...');
  
  try {
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
