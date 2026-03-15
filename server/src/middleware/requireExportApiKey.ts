import { Request, Response, NextFunction } from 'express'

/**
 * Require an operator API key for event export routes.
 * Header: X-API-KEY
 */
export const requireExportApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const configuredApiKey = process.env.EVENT_EXPORT_API_KEY?.trim()
  if (!configuredApiKey) {
    return res.status(500).json({
      code: 'server_misconfigured',
      message: 'Export API key is not configured',
      details: { field: 'EVENT_EXPORT_API_KEY' },
      requestId: res.getHeader('x-request-id'),
    })
  }

  const providedApiKey = req.get('x-api-key')?.trim()
  if (!providedApiKey || providedApiKey !== configuredApiKey) {
    return res.status(401).json({
      code: 'invalid_api_key',
      message: 'Valid X-API-KEY header is required',
      details: { field: 'x-api-key' },
      requestId: res.getHeader('x-request-id'),
    })
  }

  return next()
}
