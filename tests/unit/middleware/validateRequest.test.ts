import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../../src/middleware/validateRequest.middleware.js';

describe('validateRequest Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            query: {},
            params: {},
        };
        mockRes = {
            status: jest.fn<any>().mockReturnThis(),
            json: jest.fn<any>().mockReturnThis(),
        };
        mockNext = jest.fn() as unknown as NextFunction;
    });

    it('harus meloloskan request jika payload body memenuhi skema Zod', async () => {
        const schema = {
            body: z.object({
                tagId: z.string().min(3),
                weight: z.number().positive(),
            }),
        };

        mockReq.body = { tagId: 'TAG-101', weight: 450.5 };

        const middleware = validateRequest(schema);
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockReq.body).toEqual({ tagId: 'TAG-101', weight: 450.5 });
    });

    it('harus mengembalikan 400 dengan detail field errors jika validasi body gagal', async () => {
        const schema = {
            body: z.object({
                tagId: z.string().min(5, 'Tag ID minimal 5 karakter'),
                weight: z.number().positive('Bobot harus bernilai positif'),
            }),
        };

        mockReq.body = { tagId: 'AB', weight: -10 };

        const middleware = validateRequest(schema);
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Validasi data gagal',
            errors: expect.arrayContaining([
                expect.objectContaining({ field: 'tagId', message: 'Tag ID minimal 5 karakter' }),
                expect.objectContaining({ field: 'weight', message: 'Bobot harus bernilai positif' }),
            ]),
        }));
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('harus memvalidasi query params dan URL params jika skema disediakan', async () => {
        const schema = {
            query: z.object({
                daysAhead: z.string().transform(val => parseInt(val, 10)),
            }),
            params: z.object({
                id: z.string().uuid('ID harus berformat UUID'),
            }),
        };

        mockReq.query = { daysAhead: '60' };
        mockReq.params = { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' };

        const middleware = validateRequest(schema);
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockReq.query).toEqual({ daysAhead: 60 });
    });

    it('harus mengembalikan 400 jika validasi URL params gagal', async () => {
        const schema = {
            params: z.object({
                id: z.string().uuid('ID harus berformat UUID'),
            }),
        };

        mockReq.params = { id: 'invalid-non-uuid-string' };

        const middleware = validateRequest(schema);
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            errors: expect.arrayContaining([
                expect.objectContaining({ field: 'id', message: 'ID harus berformat UUID' }),
            ]),
        }));
    });
});
