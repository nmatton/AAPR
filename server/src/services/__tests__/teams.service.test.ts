import * as teamsService from '../teams.service';
import * as teamsRepository from '../../repositories/teams.repository';

// Mock the repository
jest.mock('../../repositories/teams.repository');

describe('teamsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTeamCoverage', () => {
    it('returns correct coverage percentage for 14/19 pillars', async () => {
      const mockTeamPractices = [
        {
          practice: {
            practicePillars: [
              { pillar: { id: 1 } },
              { pillar: { id: 2 } },
              { pillar: { id: 3 } },
            ],
          },
        },
        {
          practice: {
            practicePillars: [
              { pillar: { id: 3 } }, // duplicate - should only count once
              { pillar: { id: 4 } },
              { pillar: { id: 5 } },
            ],
          },
        },
        {
          practice: {
            practicePillars: [
              { pillar: { id: 6 } },
              { pillar: { id: 7 } },
              { pillar: { id: 8 } },
              { pillar: { id: 9 } },
              { pillar: { id: 10 } },
              { pillar: { id: 11 } },
              { pillar: { id: 12 } },
              { pillar: { id: 13 } },
              { pillar: { id: 14 } },
            ],
          },
        },
      ];

      (teamsRepository.getTeamPracticesWithPillars as jest.Mock).mockResolvedValue(
        mockTeamPractices as any
      );

      const coverage = await teamsService.calculateTeamCoverage(1);

      // 14 unique pillars out of 19 = 74% (rounded)
      expect(coverage).toBe(74);
    });

    it('returns 0% for team with no practices', async () => {
      (teamsRepository.getTeamPracticesWithPillars as jest.Mock).mockResolvedValue([]);

      const coverage = await teamsService.calculateTeamCoverage(1);

      expect(coverage).toBe(0);
    });

    it('returns 100% for team covering all 19 pillars', async () => {
      const mockTeamPractices = [
        {
          practice: {
            practicePillars: Array.from({ length: 19 }, (_, i) => ({
              pillar: { id: i + 1 },
            })),
          },
        },
      ];

      (teamsRepository.getTeamPracticesWithPillars as jest.Mock).mockResolvedValue(
        mockTeamPractices as any
      );

      const coverage = await teamsService.calculateTeamCoverage(1);

      expect(coverage).toBe(100);
    });

    it('handles duplicate pillars correctly', async () => {
      const mockTeamPractices = [
        {
          practice: {
            practicePillars: [
              { pillar: { id: 1 } },
              { pillar: { id: 1 } }, // duplicate
              { pillar: { id: 2 } },
            ],
          },
        },
      ];

      (teamsRepository.getTeamPracticesWithPillars as jest.Mock).mockResolvedValue(
        mockTeamPractices as any
      );

      const coverage = await teamsService.calculateTeamCoverage(1);

      // Only 2 unique pillars: 2/19 = 11% (rounded)
      expect(coverage).toBe(11);
    });
  });

  describe('getUserTeams', () => {
    it('returns teams with correct stats for user with 2 teams', async () => {
      const mockTeams = [
        {
          id: 1,
          name: 'Team Alpha',
          createdAt: new Date('2026-01-15T10:00:00Z'),
          _count: { teamMembers: 5, teamPractices: 8 },
          teamMembers: [{ role: 'owner' }],
          teamPractices: [
            {
              practice: {
                practicePillars: [
                  { pillar: { id: 1 } },
                  { pillar: { id: 2 } },
                  { pillar: { id: 3 } },
                ],
              },
            },
          ],
        },
        {
          id: 2,
          name: 'Team Beta',
          createdAt: new Date('2026-01-16T14:00:00Z'),
          _count: { teamMembers: 3, teamPractices: 4 },
          teamMembers: [{ role: 'member' }],
          teamPractices: [
            {
              practice: {
                practicePillars: [
                  { pillar: { id: 4 } },
                  { pillar: { id: 5 } },
                ],
              },
            },
          ],
        },
      ];

      (teamsRepository.findTeamsByUserId as jest.Mock).mockResolvedValue(mockTeams as any);

      const result = await teamsService.getUserTeams(1);

      expect(result).toHaveLength(2);
      
      // Team Alpha
      expect(result[0]).toEqual({
        id: 1,
        name: 'Team Alpha',
        memberCount: 5,
        practiceCount: 8,
        coverage: 16, // 3/19 pillars = 16%
        role: 'owner',
        createdAt: '2026-01-15T10:00:00.000Z',
      });

      // Team Beta
      expect(result[1]).toEqual({
        id: 2,
        name: 'Team Beta',
        memberCount: 3,
        practiceCount: 4,
        coverage: 11, // 2/19 pillars = 11%
        role: 'member',
        createdAt: '2026-01-16T14:00:00.000Z',
      });
    });

    it('returns empty array if user has no teams', async () => {
      (teamsRepository.findTeamsByUserId as jest.Mock).mockResolvedValue([]);

      const result = await teamsService.getUserTeams(1);

      expect(result).toEqual([]);
    });

    it('correctly identifies user role in each team', async () => {
      const mockTeams = [
        {
          id: 1,
          name: 'Team Owner',
          createdAt: new Date('2026-01-15T10:00:00Z'),
          _count: { teamMembers: 1, teamPractices: 0 },
          teamMembers: [{ role: 'owner' }],
          teamPractices: [],
        },
        {
          id: 2,
          name: 'Team Member',
          createdAt: new Date('2026-01-16T14:00:00Z'),
          _count: { teamMembers: 1, teamPractices: 0 },
          teamMembers: [{ role: 'member' }],
          teamPractices: [],
        },
      ];

      (teamsRepository.findTeamsByUserId as jest.Mock).mockResolvedValue(mockTeams as any);

      const result = await teamsService.getUserTeams(1);

      expect(result[0].role).toBe('owner');
      expect(result[1].role).toBe('member');
    });

    it('calls repository with correct userId', async () => {
      (teamsRepository.findTeamsByUserId as jest.Mock).mockResolvedValue([]);

      await teamsService.getUserTeams(42);

      expect(teamsRepository.findTeamsByUserId).toHaveBeenCalledWith(42);
      expect(teamsRepository.findTeamsByUserId).toHaveBeenCalledTimes(1);
    });
  });
});
