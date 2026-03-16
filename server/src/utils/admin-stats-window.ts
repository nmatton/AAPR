import { AppError } from '../services/auth.service';
import { z } from 'zod';
import type { AdminStatsWindowInput, WindowLabel } from '../types/admin-stats.types';

export type AdminStatsWindowQuery = {
  label?: string;
  from?: string;
  to?: string;
};

const WINDOW_LABEL_OFFSETS: Record<Exclude<WindowLabel, 'all_time' | 'custom'>, number> = {
  last_7_days: 7,
  last_30_days: 30,
  last_90_days: 90,
};

const isoDatetimeSchema = z.string().datetime({ offset: true });

const isValidDate = (value: Date): boolean => !Number.isNaN(value.getTime());

const parseIsoDate = (value: string, field: 'from' | 'to'): Date => {
  const parsedInput = isoDatetimeSchema.safeParse(value);
  if (!parsedInput.success) {
    throw new AppError('validation_error', 'Request validation failed', [
      {
        path: field,
        message: `${field} must be a valid ISO 8601 date-time`,
        code: 'invalid_date',
      },
    ], 400);
  }

  const parsed = new Date(parsedInput.data);
  return parsed;
};

const buildRelativeWindow = (label: Exclude<WindowLabel, 'all_time' | 'custom'>, now: Date): AdminStatsWindowInput => {
  const days = WINDOW_LABEL_OFFSETS[label];
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - days);

  return {
    from,
    to: now,
    label,
  };
};

export const resolveAdminStatsWindow = (
  query: AdminStatsWindowQuery,
  allTimeFrom: Date,
  nowInput?: Date
): AdminStatsWindowInput => {
  const now = nowInput ?? new Date();

  if (!isValidDate(allTimeFrom)) {
    throw new AppError('internal_error', 'Failed to resolve admin stats window', { reason: 'invalid_all_time_from' }, 500);
  }

  const hasLabel = typeof query.label === 'string' && query.label.trim().length > 0;
  const hasFrom = typeof query.from === 'string' && query.from.trim().length > 0;
  const hasTo = typeof query.to === 'string' && query.to.trim().length > 0;

  if (hasLabel && (hasFrom || hasTo)) {
    throw new AppError('validation_error', 'Request validation failed', [
      {
        path: 'label',
        message: 'label cannot be combined with from/to',
        code: 'invalid_combination',
      },
    ], 400);
  }

  if (hasFrom || hasTo) {
    if (!hasFrom || !hasTo) {
      throw new AppError('validation_error', 'Request validation failed', [
        {
          path: !hasFrom ? 'from' : 'to',
          message: 'Both from and to must be provided together',
          code: 'missing_required',
        },
      ], 400);
    }

    const from = parseIsoDate(query.from!.trim(), 'from');
    const to = parseIsoDate(query.to!.trim(), 'to');

    if (from > to) {
      throw new AppError('validation_error', 'Request validation failed', [
        {
          path: 'from',
          message: 'from must be less than or equal to to',
          code: 'invalid_range',
        },
      ], 400);
    }

    return {
      from,
      to,
      label: 'custom',
    };
  }

  if (!hasLabel) {
    return {
      from: allTimeFrom,
      to: now,
      label: 'all_time',
    };
  }

  const label = query.label!.trim() as WindowLabel;
  if (label === 'all_time') {
    return {
      from: allTimeFrom,
      to: now,
      label,
    };
  }

  if (label === 'last_7_days' || label === 'last_30_days' || label === 'last_90_days') {
    return buildRelativeWindow(label, now);
  }

  throw new AppError('validation_error', 'Request validation failed', [
    {
      path: 'label',
      message: 'label must be one of last_7_days,last_30_days,last_90_days,all_time',
      code: 'invalid_enum_value',
    },
  ], 400);
};
