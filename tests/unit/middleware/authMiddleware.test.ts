import 'reflect-metadata';
import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { container } from '../../../src/container/container.js';
import { authApiKey } from '../../../src/middleware/authApiKey.middleware.js';
import { authSession } from '../../../src/middleware/authSession.middleware.js';

describe('Auth Middlewares', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {
            headers: {},
            cookies: {},
        };
        mockRes = {
            status: jest.fn<any>().mockReturnThis(),
            json: jest.fn<any>().mockReturnThis(),
        };
        mockNext = jest.fn() as unknown as NextFunction;
    });

    describe('authApiKey Middleware', () => {
        it('harus mengembalikan 401 jika header x-api-key tidak ada', async () => {
            mockReq.headers = {};

            await authApiKey(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('harus mengembalikan 401 jika API Key tidak terdaftar di database', async () => {
            mockReq.headers = { 'x-api-key': 'invalid-key-999' };

            const mockDeviceRepo = {
                findByApiKey: jest.fn<any>().mockResolvedValue(null),
            };
            jest.spyOn(container, 'resolve').mockReturnValue(mockDeviceRepo as any);

            await authApiKey(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('harus meloloskan request (next) dan menyuntikkan req.device jika API Key valid', async () => {
            mockReq.headers = { 'x-api-key': 'valid-device-key' };

            const mockDevice = {
                id: 'dev-001',
                name: 'Scale ESP32 Alpha',
                deviceCode: 'DEV-001',
                status: 'online',
            };
            const mockDeviceRepo = {
                findByApiKey: jest.fn<any>().mockResolvedValue(mockDevice),
            };
            jest.spyOn(container, 'resolve').mockReturnValue(mockDeviceRepo as any);

            await authApiKey(mockReq as Request, mockRes as Response, mockNext);

            expect((mockReq as any).device).toEqual(mockDevice);
            expect(mockNext).toHaveBeenCalledWith();
        });
    });

    describe('authSession Middleware', () => {
        it('harus mengembalikan 401 jika session_token cookie tidak ditemukan', async () => {
            mockReq.cookies = {};

            await authSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('harus mengembalikan 401 jika sesi tidak ditemukan di database', async () => {
            mockReq.cookies = { session_token: 'fake-token' };

            const mockPairingRepo = {
                findSessionByToken: jest.fn<any>().mockResolvedValue(null),
            };
            jest.spyOn(container, 'resolve').mockReturnValue(mockPairingRepo as any);

            await authSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('harus mengembalikan 401 jika sesi sudah dicabut (revoked = true)', async () => {
            mockReq.cookies = { session_token: 'revoked-token' };

            const mockPairingRepo = {
                findSessionByToken: jest.fn<any>().mockResolvedValue({
                    id: 'sess-1',
                    sessionToken: 'revoked-token',
                    revoked: true,
                }),
            };
            jest.spyOn(container, 'resolve').mockReturnValue(mockPairingRepo as any);

            await authSession(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('harus meloloskan request (next) dan menyuntikkan req.webSession jika sesi valid', async () => {
            mockReq.cookies = { session_token: 'active-session-token' };

            const mockSession = {
                id: 'sess-active-99',
                sessionToken: 'active-session-token',
                revoked: false,
                label: 'Dashboard Laptop Peternak',
            };
            const mockPairingRepo = {
                findSessionByToken: jest.fn<any>().mockResolvedValue(mockSession),
            };
            jest.spyOn(container, 'resolve').mockReturnValue(mockPairingRepo as any);

            await authSession(mockReq as Request, mockRes as Response, mockNext);

            expect((mockReq as any).webSession).toEqual(mockSession);
            expect(mockNext).toHaveBeenCalledWith();
        });
    });
});
