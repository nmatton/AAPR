
import { getIssue } from './issues.controller';
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
});
