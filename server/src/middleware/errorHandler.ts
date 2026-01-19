import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/auth.service';

/**
 * Global error handling middleware
 * Must be registered after all routes
 */
export const errorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Get request ID for tracing
  const requestId = error.requestId || res.getHeader('x-request-id');
  
  // Handle known AppError instances
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details,
      requestId
    });
    return;
  }
  
  // Handle unexpected errors
  console.error('Unexpected error:', error);
  
  res.status(500).json({
    code: 'internal_server_error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined,
    requestId
  });
};
