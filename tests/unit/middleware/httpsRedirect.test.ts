import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { httpsRedirect } from '../../../src/middleware/httpsRedirect.middleware.js';

describe('httpsRedirect Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            headers: {},
            hostname: 'api.smartlivestock.com',
            originalUrl: '/api/v1/cattle',
        };
        mockRes = {
            redirect: jest.fn() as any,
        };
        mockNext = jest.fn() as unknown as NextFunction;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it('harus mem-bypass redirect dan memanggil next jika berada di development environment', () => {
        process.env.NODE_ENV = 'development';
        mockReq.headers = { 'x-forwarded-proto': 'http' };

        httpsRedirect(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('harus me-redirect ke HTTPS dengan status 301 jika request di production menggunakan HTTP', () => {
        process.env.NODE_ENV = 'production';
        mockReq.headers = { 'x-forwarded-proto': 'http' };

        httpsRedirect(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.redirect).toHaveBeenCalledWith(301, 'https://api.smartlivestock.com/api/v1/cattle');
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('harus meloloskan request jika request di production sudah menggunakan HTTPS', () => {
        process.env.NODE_ENV = 'production';
        mockReq.headers = { 'x-forwarded-proto': 'https' };

        httpsRedirect(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.redirect).not.toHaveBeenCalled();
    });
});
