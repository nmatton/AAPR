import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

// Team shape returned with counts, member role, and practice→pillar relations
export type TeamWithStats = Prisma.TeamGetPayload<{
  include: {
    _count: { select: { teamMembers: true; teamPractices: true } };
    teamMembers: { where: { userId: number }; select: { role: true } };
    teamPractices: {
      include: {
        practice: {
          include: {
            practicePillars: { include: { pillar: true } };
          };
        };
      };
    };
  };
}>;

// TeamPractice with practice→pillar relations, used for coverage calc
export type TeamPracticeWithPillars = Prisma.TeamPracticeGetPayload<{
  include: {
    practice: {
      include: {
        category: true;
        _count: { select: { teamPractices: true } };
        practicePillars: {
          include: {
            pillar: { include: { category: true } };
          };
        };
      };
    };
  };
}>;

/**
 * Find all teams where user is a member
 * @param userId - User identifier
 * @returns Array of teams with member/practice counts and pillar data
 */
export const findTeamsByUserId = async (userId: number): Promise<TeamWithStats[]> => {
  return prisma.team.findMany({
    where: {
      teamMembers: {
        some: { userId }
      }
    },
    include: {
      _count: {
        select: {
          teamMembers: true,
          teamPractices: true
        }
      },
      teamMembers: {
        where: { userId },
        select: { role: true }
      },
      teamPractices: {
        include: {
          practice: {
            include: {
              practicePillars: {
                include: {
                  pillar: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

/**
 * Get team practices with their pillar associations
 * Used for coverage calculation
 * @param teamId - Team identifier
 * @returns Array of team practices with practice and pillar data
 */
export const getTeamPracticesWithPillars = async (teamId: number): Promise<TeamPracticeWithPillars[]> => {
  return prisma.teamPractice.findMany({
    where: { teamId },
    include: {
      practice: {
        include: {
          category: true,
          _count: { select: { teamPractices: true } },
          practicePillars: {
            include: {
              pillar: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      }
    }
  });
};

/**
 * Remove a practice from a team (team-scoped delete)
 * @param teamId - Team identifier
 * @param practiceId - Practice identifier
 * @param tx - Optional Prisma transaction client
 * @returns Deleted team practice
 */
export const removePracticeFromTeam = async (
  teamId: number,
  practiceId: number,
  tx?: Prisma.TransactionClient
): Promise<Prisma.TeamPracticeGetPayload<{}>> => {
  const client = tx ?? prisma;
  return client.teamPractice.delete({
    where: {
      teamId_practiceId: {
        teamId,
        practiceId
      }
    }
  });
};
