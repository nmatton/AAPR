/** Fields that must be redacted from Honeybadger notices and request params */
export const HONEYBADGER_REDACTED_KEYS = [
  'password',
  'email',
  'name',
  'userId',
  'invitedBy',
  'invitedUserId',
  'JWT_SECRET',
  'DATABASE_URL',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_HOST',
  'authorization',
  'cookie',
  'accessToken',
  'refreshToken',
  'bearerToken',
];
