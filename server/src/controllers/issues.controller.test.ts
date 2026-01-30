
import { getIssue, getIssues, getStats } from './issues.controller';
import * as issueService from '../services/issue.service';
import { AppError } from '../services/auth.service';

jest.mock('../services/issue.service');

describe('Issues Controller', () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = {
            params: { teamId: '1', issueId: '100' },
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('getIssue', () => {
        it('should return issue details', async () => {
            const mockDetails = { issue: {}, history: [] };
            (issueService.getIssueDetails as jest.Mock).mockResolvedValue(mockDetails);

            await getIssue(req, res, next);

            expect(issueService.getIssueDetails).toHaveBeenCalledWith(1, 100);
            expect(res.json).toHaveBeenCalledWith(mockDetails);
        });

        it('should validate params', async () => {
            req.params.teamId = 'invalid';
            await getIssue(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
        });
    });

    describe('getIssues', () => {
        beforeEach(() => {
            req.params = { teamId: '1' };
            req.query = {};
        });

        it('should return list of issues with parsed params', async () => {
            req.query = {
                status: 'OPEN',
                practiceId: '101',
                sortBy: 'comments',
                sortDir: 'asc'
            };
            const mockIssues = [{ id: 1, title: 'Test' }];
            (issueService.getIssues as jest.Mock).mockResolvedValue(mockIssues);

            await getIssues(req, res, next);

            expect(issueService.getIssues).toHaveBeenCalledWith(1, {
                status: 'OPEN',
                practiceId: 101,
                authorId: undefined,
                sortBy: 'comments',
                sortDir: 'asc'
            });
            expect(res.json).toHaveBeenCalledWith(mockIssues);
        });

        it('should validate teamId', async () => {
            req.params.teamId = 'invalid';
            await getIssues(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
        });
    });

    describe('getStats', () => {
        beforeEach(() => {
            req.params = { teamId: '1' };
        });

        it('should return issue stats', async () => {
            const mockStats = { total: 10, byStatus: { open: 5, done: 5 } };
            (issueService as any).getIssueStats = jest.fn().mockResolvedValue(mockStats);

            await getStats(req, res, next);

            expect((issueService as any).getIssueStats).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith(mockStats);
        });

        it('should validate teamId', async () => {
            req.params.teamId = 'invalid';
            await getStats(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(AppError));
        });
    });
});


