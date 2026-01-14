import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      status: 'error'
    });
  }

  // PostgreSQL specific errors
  if (err.name === 'QueryFailedError' || (err as any).code) {
    const pgError = err as any;
    
    // Unique constraint violation
    if (pgError.code === '23505') {
      return res.status(409).json({
        error: 'Resource already exists',
        details: pgError.detail
      });
    }

    // Foreign key violation
    if (pgError.code === '23503') {
      return res.status(400).json({
        error: 'Invalid reference to related resource',
        details: pgError.detail
      });
    }

    // Check constraint violation
    if (pgError.code === '23514') {
      return res.status(400).json({
        error: 'Data validation failed',
        details: pgError.detail
      });
    }
  }

  // Unknown error
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
};
