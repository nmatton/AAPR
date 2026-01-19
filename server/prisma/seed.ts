import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

// Create connection pool for PostgreSQL adapter (Prisma 7.x requirement)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const PILLARS = [
  // Team Structure
  { name: 'Team Autonomy', category: 'Team Structure' },
  { name: 'Cross-Functional Teams', category: 'Team Structure' },
  { name: 'Self-Organization', category: 'Team Structure' },
  { name: 'Colocation', category: 'Team Structure' },
  
  // Development Process
  { name: 'Iterative Development', category: 'Development Process' },
  { name: 'Incremental Development', category: 'Development Process' },
  { name: 'Continuous Integration', category: 'Development Process' },
  { name: 'Test-Driven Development', category: 'Development Process' },
  { name: 'Refactoring', category: 'Development Process' },
  
  // Customer Collaboration
  { name: 'Customer Involvement', category: 'Customer Collaboration' },
  { name: 'Frequent Delivery', category: 'Customer Collaboration' },
  { name: 'Adaptive Planning', category: 'Customer Collaboration' },
  
  // Team Practices
  { name: 'Daily Standup', category: 'Team Practices' },
  { name: 'Retrospectives', category: 'Team Practices' },
  { name: 'Code Reviews', category: 'Team Practices' },
  { name: 'Pair Programming', category: 'Team Practices' },
  
  // Quality & Documentation
  { name: 'Sustainable Pace', category: 'Quality & Documentation' },
  { name: 'Technical Excellence', category: 'Quality & Documentation' },
  { name: 'Simple Design', category: 'Quality & Documentation' },
];

const SAMPLE_PRACTICES = [
  {
    title: 'Sprint Planning',
    goal: 'Plan work for the upcoming sprint with the team',
    category: 'Planning',
    pillars: ['Iterative Development', 'Adaptive Planning', 'Team Autonomy']
  },
  {
    title: 'Daily Standup Meeting',
    goal: 'Synchronize team activities and identify blockers',
    category: 'Communication',
    pillars: ['Daily Standup', 'Self-Organization']
  },
  {
    title: 'Sprint Retrospective',
    goal: 'Reflect on the sprint and identify improvements',
    category: 'Improvement',
    pillars: ['Retrospectives', 'Adaptive Planning']
  },
  {
    title: 'Test-Driven Development',
    goal: 'Write tests before implementation code',
    category: 'Development',
    pillars: ['Test-Driven Development', 'Technical Excellence', 'Refactoring']
  },
  {
    title: 'Continuous Integration',
    goal: 'Integrate code changes frequently to detect issues early',
    category: 'Development',
    pillars: ['Continuous Integration', 'Frequent Delivery']
  },
  {
    title: 'Pair Programming',
    goal: 'Two developers work together at one workstation',
    category: 'Development',
    pillars: ['Pair Programming', 'Code Reviews', 'Technical Excellence']
  },
  {
    title: 'User Story Mapping',
    goal: 'Create a visual representation of user journeys',
    category: 'Planning',
    pillars: ['Customer Involvement', 'Adaptive Planning']
  },
  {
    title: 'Sprint Review',
    goal: 'Demonstrate completed work to stakeholders',
    category: 'Communication',
    pillars: ['Customer Involvement', 'Frequent Delivery']
  },
  {
    title: 'Definition of Done',
    goal: 'Establish shared understanding of completion criteria',
    category: 'Quality',
    pillars: ['Technical Excellence', 'Simple Design']
  },
  {
    title: 'Backlog Refinement',
    goal: 'Review and prepare upcoming backlog items',
    category: 'Planning',
    pillars: ['Adaptive Planning', 'Team Autonomy']
  }
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.practicePillar.deleteMany();
  await prisma.teamPractice.deleteMany();
  await prisma.practice.deleteMany();
  await prisma.pillar.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();

  // Seed pillars
  console.log('📌 Seeding pillars...');
  const createdPillars = await Promise.all(
    PILLARS.map((pillar) =>
      prisma.pillar.create({
        data: pillar,
      })
    )
  );
  console.log(`✅ Created ${createdPillars.length} pillars`);

  // Create a map of pillar names to IDs
  const pillarMap = new Map(
    createdPillars.map((p) => [p.name, p.id])
  );

  // Seed practices with pillar associations
  console.log('📝 Seeding practices...');
  for (const practiceData of SAMPLE_PRACTICES) {
    const { pillars, ...practiceFields } = practiceData;
    
    const practice = await prisma.practice.create({
      data: {
        ...practiceFields,
        isGlobal: true,
      },
    });

    // Create pillar associations
    const pillarAssociations = pillars
      .map((pillarName) => pillarMap.get(pillarName))
      .filter((id): id is number => id !== undefined)
      .map((pillarId) => ({
        practiceId: practice.id,
        pillarId,
      }));

    await prisma.practicePillar.createMany({
      data: pillarAssociations,
    });
  }
  console.log(`✅ Created ${SAMPLE_PRACTICES.length} practices with pillar associations`);

  // Create sample teams for testing
  console.log('👥 Creating sample teams...');
  
  // Get first user (from previous stories)
  const firstUser = await prisma.user.findFirst();
  
  if (firstUser) {
    const team1 = await prisma.team.create({
      data: {
        name: 'Development Team Alpha',
        teamMembers: {
          create: {
            userId: firstUser.id,
            role: 'owner',
          },
        },
      },
    });

    // Add some practices to team1
    await prisma.teamPractice.createMany({
      data: [
        { teamId: team1.id, practiceId: 1 },
        { teamId: team1.id, practiceId: 2 },
        { teamId: team1.id, practiceId: 4 },
        { teamId: team1.id, practiceId: 5 },
        { teamId: team1.id, practiceId: 6 },
      ],
    });

    const team2 = await prisma.team.create({
      data: {
        name: 'UX Research Team',
        teamMembers: {
          create: {
            userId: firstUser.id,
            role: 'member',
          },
        },
      },
    });

    // Add some practices to team2
    await prisma.teamPractice.createMany({
      data: [
        { teamId: team2.id, practiceId: 7 },
        { teamId: team2.id, practiceId: 8 },
      ],
    });

    console.log(`✅ Created 2 sample teams with practices for user ${firstUser.email}`);
  } else {
    console.log('⚠️  No users found - skipping sample team creation');
  }

  console.log('✨ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
