import { Request, Response, NextFunction } from 'express';
import * as tagsService from '../services/tags.service';

export const getTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { isGlobal, type, practiceIds } = req.query;

        // Practice-specific tag filtering: return union of tags from given practice IDs
        if (practiceIds !== undefined) {
            const rawIds = Array.isArray(practiceIds) ? practiceIds : [practiceIds];
            const ids = (rawIds as string[])
                .map(id => Number(id))
                .filter(id => Number.isInteger(id) && id > 0);

            if (ids.length > 0) {
                const tags = await tagsService.getTagsByPracticeIds(ids);
                return res.json(tags);
            }
            // practiceIds was provided but all values were invalid integers
            return res.status(400).json({ error: 'validation_error', message: 'Invalid practiceIds parameter' });
        }

        let isGlobalBool: boolean | undefined = undefined;
        if (isGlobal !== undefined) {
            isGlobalBool = isGlobal === 'true';
        }

        const tags = await tagsService.getTags(isGlobalBool, type as string | undefined);
        res.json(tags);
    } catch (error) {
        next(error);
    }
};
