import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util.js';
import * as Sentry from '@sentry/node';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Log error menggunakan Pino
  logger.error({
    msg: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // 2. Laporkan ke Sentry jika ini error internal (500) dan bukan error operasional biasa
  if (!err.statusCode || err.statusCode === 500) {
    Sentry.captureException(err);
  }

  // 3. Tentukan status code (default 500 jika tidak spesifik)
  const statusCode = err.statusCode || 500;

  // 4. Sembunyikan stack trace jika di production demi keamanan
  const errorResponse = {
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(errorResponse);
};
