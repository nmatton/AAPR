import { prisma } from '../lib/prisma';
import { Comment, Prisma } from '@prisma/client';

export const create = async (
    data: Prisma.CommentUncheckedCreateInput,
    tx?: Prisma.TransactionClient
): Promise<Comment> => {
    const client = tx || prisma;
    return client.comment.create({
        data
    });
};

export type CommentWithAuthor = Prisma.CommentGetPayload<{
    include: { author: { select: { id: true, name: true } } }
}>;

export const findByIssueId = async (issueId: number): Promise<CommentWithAuthor[]> => {
    return prisma.comment.findMany({
        where: { issueId },
        include: {
            author: {
                select: {
                    id: true,
                    name: true
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
};
