import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { updateTeam } from './teams.controller';
import * as teamsService from '../services/teams.service';

jest.mock('../services/teams.service');

describe('teams.controller.updateTeam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns updated team payload', async () => {
    const mockUpdatedTeam = {
      id: 1,
      name: 'New Team Name',
      version: 2,
      updatedAt: new Date('2026-01-23T10:00:00Z')
    };

    (teamsService.updateTeamName as jest.MockedFunction<typeof teamsService.updateTeamName>)
      .mockResolvedValue(mockUpdatedTeam);

    const req = {
      params: { teamId: '1' },
      body: { name: 'New Team Name', version: 1 },
      user: { userId: 5 },
      id: 'req-test-1'
    } as any;

    const res = {
      json: jest.fn()
    } as any;

    const next = jest.fn();

    await updateTeam(req, res, next);

    expect(teamsService.updateTeamName).toHaveBeenCalledWith(1, 'New Team Name', 1, 5);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        id: 1,
        name: 'New Team Name',
        version: 2,
        updatedAt: '2026-01-23T10:00:00.000Z'
      },
      requestId: 'req-test-1'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes validation errors to next', async () => {
    const req = {
      params: { teamId: '1' },
      body: { name: 'AB', version: 1 },
      user: { userId: 5 },
      id: 'req-test-2'
    } as any;

    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await updateTeam(req, res, next);

    expect(teamsService.updateTeamName).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.code).toBe('validation_error');
  });
});
