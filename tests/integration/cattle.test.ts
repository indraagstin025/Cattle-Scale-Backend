import { jest } from '@jest/globals';
import request from 'supertest';

/**
 * Integration test untuk Cattle Routes.
 * 
 * Strategi mock: Mock service layer (ICattleService) langsung di DI container tsyringe,
 * sehingga tidak perlu menyentuh Prisma/database sama sekali.
 * authSession di-bypass agar fokus hanya pada controller & routing logic.
 */

// ── 1. Mock authSession agar tidak validasi session cookie ──────────────────
jest.unstable_mockModule('../../src/middleware/authSession.middleware.js', () => ({
    authSession: (_req: any, _res: any, next: any) => next()
}));

// ── 2. Mock validateRequest agar tidak validasi DTO (fokus ke controller) ──
jest.unstable_mockModule('../../src/middleware/validateRequest.middleware.js', () => ({
    validateRequest: () => (_req: any, _res: any, next: any) => next()
}));

// ── 3. Mock AuditService agar tidak butuh DB untuk audit trail ──────────────
jest.unstable_mockModule('../../src/services/AuditService.js', () => ({
    AuditService: class {
        log = jest.fn<any>().mockResolvedValue(undefined);
    }
}));

// ── 4. Mock CattleService methods ────────────────────────────────────────────
const mockGetAllCattle = jest.fn<any>();
const mockGetCattleById = jest.fn<any>();
const mockRegisterCattle = jest.fn<any>();
const mockUpdateCattle = jest.fn<any>();
const mockRemoveCattle = jest.fn<any>();

jest.unstable_mockModule('../../src/services/CattleService.js', () => ({
    CattleService: class {
        getAllCattle = mockGetAllCattle;
        getCattleById = mockGetCattleById;
        registerCattle = mockRegisterCattle;
        updateCattle = mockUpdateCattle;
        removeCattle = mockRemoveCattle;
    }
}));

// ── 5. Mock Prisma (diperlukan agar container.ts tidak throw) ────────────────
jest.unstable_mockModule('../../src/config/prisma.config.js', () => ({
    prisma: { $queryRaw: jest.fn() }
}));

// ── 6. Mock seluruh repository sehingga container.ts tidak butuh DB ─────────
jest.unstable_mockModule('../../src/repositories/CattleRepository.js', () => ({
    CattleRepository: class {}
}));
jest.unstable_mockModule('../../src/repositories/DeviceRepository.js', () => ({
    DeviceRepository: class {}
}));
jest.unstable_mockModule('../../src/repositories/WeightLogRepository.js', () => ({
    WeightLogRepository: class {}
}));
jest.unstable_mockModule('../../src/repositories/PairingRepository.js', () => ({
    PairingRepository: class {}
}));
jest.unstable_mockModule('../../src/repositories/FirmwareRepository.js', () => ({
    FirmwareRepository: class {}
}));

// ── Dynamic import SETELAH semua mock terdefinisi ────────────────────────────
const { default: app } = await import('../../src/app.js');

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: GET /api/v1/cattle', () => {

    beforeEach(() => jest.clearAllMocks());

    it('harus mengembalikan daftar sapi dengan status 200', async () => {
        mockGetAllCattle.mockResolvedValue([
            { id: '1', tagId: 'TAG1', name: 'Sapi A', ageMonths: 12 },
            { id: '2', tagId: 'TAG2', name: 'Sapi B', ageMonths: 6  },
        ] as any);

        const res = await request(app).get('/api/v1/cattle');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data[0].tagId).toBe('TAG1');
        expect(mockGetAllCattle).toHaveBeenCalledTimes(1);
    });

    it('harus mengembalikan status 500 jika service mengalami error tak terduga', async () => {
        mockGetAllCattle.mockRejectedValue(new Error('Database query timed out'));

        const res = await request(app).get('/api/v1/cattle');

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('success', false);
    });
});

describe('Integration: GET /api/v1/cattle/:id', () => {

    beforeEach(() => jest.clearAllMocks());

    it('harus mengembalikan 404 jika sapi tidak ditemukan', async () => {
        mockGetCattleById.mockResolvedValue(null);

        const res = await request(app).get('/api/v1/cattle/not-found-id');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(mockGetCattleById).toHaveBeenCalledWith('not-found-id');
    });

    it('harus mengembalikan 200 dengan data sapi jika ditemukan', async () => {
        mockGetCattleById.mockResolvedValue({ id: 'abc-123', tagId: 'TAG123', ageMonths: 8 } as any);

        const res = await request(app).get('/api/v1/cattle/abc-123');

        expect(res.status).toBe(200);
        expect(res.body.data.tagId).toBe('TAG123');
        expect(mockGetCattleById).toHaveBeenCalledWith('abc-123');
    });

    it('harus menangani 500 jika terjadi kegagalan database saat mencari id', async () => {
        mockGetCattleById.mockRejectedValue(new Error('Connection lost'));

        const res = await request(app).get('/api/v1/cattle/err-id');

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

describe('Integration: POST /api/v1/cattle', () => {

    beforeEach(() => jest.clearAllMocks());

    it('harus membuat sapi baru dan mengembalikan 201', async () => {
        mockRegisterCattle.mockResolvedValue({ id: 'new-99', tagId: 'TAG-NEW' } as any);

        const payload = {
            tagId: 'TAG-NEW',
            name: 'Sapi Baru',
            breed: 'Brahman',
            gender: 'male',
            initialWeight: 150,
            targetWeight: 500,
        };

        const res = await request(app).post('/api/v1/cattle').send(payload);

        expect(res.status).toBe(201);
        expect(res.body.data.id).toBe('new-99');
        expect(mockRegisterCattle).toHaveBeenCalledTimes(1);
    });

    it('harus mengembalikan 500 jika terjadi kesalahan internal saat registrasi sapi', async () => {
        mockRegisterCattle.mockRejectedValue(new Error('Unique constraint violation on tagId'));

        const res = await request(app)
            .post('/api/v1/cattle')
            .send({ tagId: 'DUPLICATE-TAG' });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

describe('Integration: PUT /api/v1/cattle/:id', () => {

    beforeEach(() => jest.clearAllMocks());

    it('harus mengupdate sapi dan mengembalikan 200', async () => {
        mockUpdateCattle.mockResolvedValue({ id: 'abc-123', name: 'Updated' } as any);

        const res = await request(app)
            .put('/api/v1/cattle/abc-123')
            .send({ name: 'Updated' });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Updated');
        expect(mockUpdateCattle).toHaveBeenCalledWith('abc-123', { name: 'Updated' });
    });

    it('harus mengembalikan 500 jika terjadi kesalahan saat proses update', async () => {
        mockUpdateCattle.mockRejectedValue(new Error('Update failed'));

        const res = await request(app)
            .put('/api/v1/cattle/err-id')
            .send({ name: 'Fail' });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

describe('Integration: DELETE /api/v1/cattle/:id', () => {

    beforeEach(() => jest.clearAllMocks());

    it('harus menghapus sapi (soft delete) dan mengembalikan 200', async () => {
        mockRemoveCattle.mockResolvedValue({ id: 'abc-123', deletedAt: new Date() } as any);

        const res = await request(app).delete('/api/v1/cattle/abc-123');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockRemoveCattle).toHaveBeenCalledWith('abc-123');
    });

    it('harus mengembalikan 500 jika penghapusan gagal di database', async () => {
        mockRemoveCattle.mockRejectedValue(new Error('Delete query failed'));

        const res = await request(app).delete('/api/v1/cattle/err-id');

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});
