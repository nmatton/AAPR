
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';


async function main() {
    console.log('Verifying Migration 2.1.11 Data Integrity...');

    // 1. Count rows
    const count = await prisma.practiceAssociation.count();
    console.log(`Row count in practice_associations: ${count}`);

    if (count === 0) {
        console.warn('WARNING: No associations found. Migration might not have migrated data yet.');
    }

    // 2. Check "Sprint Planning" associations
    // In JSON it has: Planning Poker (Complementarity), Definition of Done (Dependency), Backlog Refinement (Dependency)
    const sprintPlanning = await prisma.practice.findFirst({
        where: { title: 'Sprint Planning' },
        include: {
            sourceAssociations: {
                include: {
                    targetPractice: true
                }
            }
        }
    });

    if (sprintPlanning) {
        console.log(`\nFound practice: ${sprintPlanning.title} (ID: ${sprintPlanning.id})`);
        console.log(`Associations found: ${sprintPlanning.sourceAssociations.length}`);

        sprintPlanning.sourceAssociations.forEach(assoc => {
            console.log(`- ${assoc.targetPractice.title} [${assoc.associationType}]`);
        });
    } else {
        console.error('Sprint Planning practice not found!');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
