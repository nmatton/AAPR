
import { prisma } from '../lib/prisma';
import { IssueStatus, Prisma } from '@prisma/client';

export interface FindIssuesOptions {
    teamId: number;
    status?: IssueStatus;
    practiceId?: number;
    authorId?: number;
    sortBy?: 'createdAt' | 'comments';
    sortDir?: 'asc' | 'desc';
}

export const findById = async (id: number, teamId: number) => {
    return prisma.issue.findUnique({
        where: { id, teamId },
        include: {
            createdByUser: {
                select: {
                    id: true,
                    name: true,
                },
            },
            decisionRecorder: {
                select: {
                    id: true,
                    name: true,
                },
            },
            evaluationRecorder: {
                select: {
                    id: true,
                    name: true,
                },
            },
            linkedPractices: {
                include: {
                    practice: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            },
            issueTags: {
                include: {
                    tag: true,
                },
            },
        },
    });
};

export const findAll = async (options: FindIssuesOptions) => {
    const { teamId, status, practiceId, authorId, sortBy = 'createdAt', sortDir = 'desc' } = options;

    const where: Prisma.IssueWhereInput = {
        teamId,
        ...(status && { status }),
        ...(authorId && { createdBy: authorId }),
        ...(practiceId && {
            linkedPractices: {
                some: { practiceId }
            }
        })
    };

    let orderBy: Prisma.IssueOrderByWithRelationInput = {};

    if (sortBy === 'comments') {
        orderBy = {
            comments: {
                _count: sortDir
            }
        };
    } else {
        orderBy = {
            [sortBy]: sortDir
        };
    }

    return prisma.issue.findMany({
        where,
        orderBy,
        include: {
            createdByUser: {
                select: {
                    id: true,
                    name: true,
                },
            },
            linkedPractices: {
                include: {
                    practice: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            },
            issueTags: {
                include: {
                    tag: true,
                },
            },
            _count: {
                select: { comments: true }
            }
        },
    });
};

export const countByStatus = async (teamId: number) => {
    return prisma.issue.groupBy({
        by: ['status'],
        where: { teamId },
        _count: {
            _all: true
        }
    });
};

export const countIssuesByPractice = async (teamId: number) => {
    return prisma.issuePractice.groupBy({
        by: ['practiceId'],
        where: {
            issue: {
                teamId
            }
        },
        _count: {
            issueId: true
        }
    });
};

export const update = async (id: number, teamId: number, data: Prisma.IssueUpdateInput) => {
    return prisma.issue.update({
        where: { id, teamId },
        data,
        include: {
            createdByUser: {
                select: {
                    id: true,
                    name: true,
                },
            },
            linkedPractices: {
                include: {
                    practice: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            },
            issueTags: {
                include: {
                    tag: true,
                },
            },
        },
    });
};



