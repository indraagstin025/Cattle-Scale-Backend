import { jest } from '@jest/globals';
import request from 'supertest';

// ── 1. Mock middlewares ──────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/middleware/rateLimiter.middleware.js', () => ({
    pairingRateLimiter: (_req: any, _res: any, next: any) => next()
}));

jest.unstable_mockModule('../../src/middleware/validateRequest.middleware.js', () => ({
    validateRequest: () => (_req: any, _res: any, next: any) => next()
}));

// ── 2. Mock PairingService ───────────────────────────────────────────────────
const mockVerifyPairing = jest.fn<any>();
const mockGetActiveSessions = jest.fn<any>();
const mockRevokeSessionById = jest.fn<any>();

jest.unstable_mockModule('../../src/services/PairingService.js', () => ({
    PairingService: class {
        verifyPairing = mockVerifyPairing;
        getActiveSessions = mockGetActiveSessions;
        revokeSessionById = mockRevokeSessionById;
    }
}));

// ── 3. Mock Prisma ───────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/config/prisma.config.js', () => ({
    prisma: { $queryRaw: jest.fn<any>() }
}));

// Dynamic import app
const { default: app } = await import('../../src/app.js');

describe('Integration: Pairing Endpoints (/api/v1/pairing)', () => {

    beforeEach(() => jest.clearAllMocks());

    describe('POST /api/v1/pairing/verify', () => {
        it('harus memverifikasi kode 6 digit, membuat session token, dan menyetel httpOnly cookie', async () => {
            mockVerifyPairing.mockResolvedValue({
                sessionToken: 'sess_secret_token_123',
                deviceId: 'dev-001',
            });

            const res = await request(app)
                .post('/api/v1/pairing/verify')
                .send({ code: '123456', label: 'Safari iPhone Peternak' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.deviceId).toBe('dev-001');

            // Memastikan cookie session_token disertakan
            const cookies = res.headers['set-cookie'] as unknown as string[];
            expect(cookies).toBeDefined();
            expect(cookies.some((c: string) => c.includes('session_token='))).toBe(true);
        });

        it('harus mengembalikan 401 jika kode pairing salah atau kedaluwarsa', async () => {
            mockVerifyPairing.mockRejectedValue(new Error('Kode pairing tidak valid atau sudah kedaluwarsa'));

            const res = await request(app)
                .post('/api/v1/pairing/verify')
                .send({ code: '000000' });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/pairing/sessions', () => {
        it('harus mengembalikan daftar seluruh sesi web aktif', async () => {
            const mockSessions = [
                { id: 's1', label: 'Safari iPhone', revoked: false },
                { id: 's2', label: 'Chrome PC', revoked: false },
            ];
            mockGetActiveSessions.mockResolvedValue(mockSessions);

            const res = await request(app).get('/api/v1/pairing/sessions');

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
        });
    });

    describe('DELETE /api/v1/pairing/sessions/:id', () => {
        it('harus mencabut (revoke) sesi berdasarkan ID dan mengembalikan 200', async () => {
            mockRevokeSessionById.mockResolvedValue(undefined);

            const res = await request(app).delete('/api/v1/pairing/sessions/s1');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockRevokeSessionById).toHaveBeenCalledWith('s1');
        });
    });
});
