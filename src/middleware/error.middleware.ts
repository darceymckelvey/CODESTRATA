import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  details?: any;
}

/**
 * Centralized error handler middleware
 * Follows the WindSurf Project Style Guide for error handling
 */
const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || 'Internal server error';
  
  // In development, send more detailed error information
  const errorResponse = {
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  };
  
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
