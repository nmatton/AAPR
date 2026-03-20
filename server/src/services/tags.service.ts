import { prisma } from '../lib/prisma';
import { TAG_DESCRIPTIONS, VALID_TAGS } from '../constants/tags.constants';

const GLOBAL_TAG_FILTER = { isGlobal: true };
const TAG_ORDER_BY = { name: 'asc' } as const;

export const ensureTagCatalog = async () => {
    await prisma.tag.createMany({
        data: VALID_TAGS.map((name) => ({
            name,
            description: TAG_DESCRIPTIONS[name],
            type: 'System',
            isGlobal: true,
        })),
        skipDuplicates: true,
    });
};

export const getTags = async (isGlobal?: boolean, type?: string) => {
    await ensureTagCatalog();

    const where: any = {};
    if (isGlobal !== undefined) where.isGlobal = isGlobal;
    if (type !== undefined) where.type = type;
    
    return prisma.tag.findMany({
        where,
        orderBy: TAG_ORDER_BY
    });
};

/**
 * Returns the Tag records associated with the given practices.
 * Each Practice stores its behavioral tags as a JSON array of tag name strings.
 * This function unions all tag names from the specified practices, then queries
 * the Tag table to return the matching canonical Tag records.
 */
export const getTagsByPracticeIds = async (practiceIds: number[]) => {
    await ensureTagCatalog();

    const practices = await prisma.practice.findMany({
        where: { id: { in: practiceIds } },
        select: { id: true, tags: true },
    });

    if (practices.length === 0) {
        return [];
    }

    const tagNamesSet = new Set<string>();
    for (const practice of practices) {
        if (Array.isArray(practice.tags)) {
            for (const tagName of practice.tags as string[]) {
                if (tagName) tagNamesSet.add(tagName);
            }
        }
    }

    if (tagNamesSet.size === 0) {
        return prisma.tag.findMany({
            where: GLOBAL_TAG_FILTER,
            orderBy: TAG_ORDER_BY,
        });
    }

    const matchingTags = await prisma.tag.findMany({
        where: { name: { in: Array.from(tagNamesSet) } },
        orderBy: TAG_ORDER_BY,
    });

    if (matchingTags.length > 0) {
        return matchingTags;
    }

    return prisma.tag.findMany({
        where: GLOBAL_TAG_FILTER,
        orderBy: TAG_ORDER_BY,
    });
};
