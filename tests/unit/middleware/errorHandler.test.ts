import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── 1. Mock Sentry & Logger ──────────────────────────────────────────────────
const mockCaptureException = jest.fn();
jest.unstable_mockModule('@sentry/node', () => ({
    captureException: mockCaptureException,
}));

const mockLoggerError = jest.fn();
jest.unstable_mockModule('../../../src/utils/logger.util.js', () => ({
    logger: {
        error: mockLoggerError,
    },
}));

// Dynamic import errorHandler
const { errorHandler } = await import('../../../src/middleware/errorHandler.middleware.js');

describe('errorHandler Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            method: 'POST',
            originalUrl: '/api/v1/cattle',
            ip: '127.0.0.1',
        };
        mockRes = {
            status: jest.fn<any>().mockReturnThis(),
            json: jest.fn<any>().mockReturnThis(),
        };
        mockNext = jest.fn() as unknown as NextFunction;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it('harus mencatat log error via Pino dan melaporkan ke Sentry untuk error 500', () => {
        const err: any = new Error('Database connection crashed');
        err.stack = 'Error: Database connection crashed\n at index.ts:1';

        errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

        expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Database connection crashed',
            method: 'POST',
            url: '/api/v1/cattle',
        }));
        expect(mockCaptureException).toHaveBeenCalledWith(err);
        expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('harus menyamarkan pesan error 500 di environment production demi keamanan', () => {
        process.env.NODE_ENV = 'production';

        const err: any = new Error('Sensitive DB password leaked in error');
        errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: 'Internal Server Error',
        });
    });

    it('harus menyertakan stack trace jika berada di environment development', () => {
        process.env.NODE_ENV = 'development';

        const err: any = new Error('Test Dev Error');
        err.stack = 'Dev Stack Trace';
        errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Test Dev Error',
            stack: 'Dev Stack Trace',
        }));
    });

    it('harus mempertahankan status code operasional (400/404) dan TIDAK melaporkan ke Sentry', () => {
        const err: any = new Error('Data tidak ditemukan');
        err.statusCode = 404;

        errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: false,
            message: 'Data tidak ditemukan',
        });
        expect(mockCaptureException).not.toHaveBeenCalled();
    });
});
