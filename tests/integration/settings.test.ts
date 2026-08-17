import { jest } from '@jest/globals';
import request from 'supertest';

// ── 1. Mock authSession ──────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/middleware/authSession.middleware.js', () => ({
    authSession: (req: any, _res: any, next: any) => {
        req.webSession = { id: 'sess-admin-1' };
        next();
    }
}));

// ── 2. Mock SettingsService ──────────────────────────────────────────────────
const mockGetAllSettings = jest.fn<any>();
const mockUpsertSetting = jest.fn<any>();
const mockGetSpikeThreshold = jest.fn<any>();
const mockGetDeviceBufferStatus = jest.fn<any>();

jest.unstable_mockModule('../../src/services/SettingsService.js', () => ({
    SettingsService: class {
        getAllSettings = mockGetAllSettings;
        upsertSetting = mockUpsertSetting;
        getSpikeThreshold = mockGetSpikeThreshold;
        getDeviceBufferStatus = mockGetDeviceBufferStatus;
    }
}));

// ── 3. Mock AuditService ─────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/services/AuditService.js', () => ({
    AuditService: class {
        log = jest.fn<any>().mockResolvedValue(undefined);
    }
}));

// ── 4. Mock Prisma ───────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/config/prisma.config.js', () => ({
    prisma: { $queryRaw: jest.fn<any>() }
}));

// Dynamic import app
const { default: app } = await import('../../src/app.js');

describe('Integration: Settings Endpoints (/api/v1/settings)', () => {

    beforeEach(() => jest.clearAllMocks());

    describe('GET /api/v1/settings', () => {
        it('harus mengembalikan seluruh daftar pengaturan sistem (200)', async () => {
            mockGetAllSettings.mockResolvedValue([
                { key: 'farm_name', value: 'Peternakan Jaya', description: 'Nama Farm' },
                { key: 'farm_timezone', value: 'Asia/Jakarta', description: 'Zona Waktu' },
            ]);

            const res = await request(app).get('/api/v1/settings');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(mockGetAllSettings).toHaveBeenCalledTimes(1);
        });
    });

    describe('PUT /api/v1/settings/:key', () => {
        it('harus memperbarui nilai pengaturan sistem (200)', async () => {
            const updatedSetting = {
                key: 'farm_name',
                value: 'Peternakan Sapi Makmur',
                description: 'Nama Baru',
            };
            mockUpsertSetting.mockResolvedValue(updatedSetting);

            const res = await request(app)
                .put('/api/v1/settings/farm_name')
                .send({ value: 'Peternakan Sapi Makmur', description: 'Nama Baru' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.value).toBe('Peternakan Sapi Makmur');
        });

        it('harus mengembalikan 400 jika key pengaturan tidak valid', async () => {
            mockUpsertSetting.mockRejectedValue(new Error("Key 'invalid_key' tidak dikenal."));

            const res = await request(app)
                .put('/api/v1/settings/invalid_key')
                .send({ value: '123' });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/settings/spike-threshold', () => {
        it('harus mengembalikan konfigurasi ambang batas spike detection (200)', async () => {
            mockGetSpikeThreshold.mockResolvedValue({
                thresholdKg: 50,
                windowSeconds: 10,
            });

            const res = await request(app).get('/api/v1/settings/spike-threshold');

            expect(res.status).toBe(200);
            expect(res.body.data.thresholdKg).toBe(50);
            expect(res.body.data.windowSeconds).toBe(10);
        });
    });

    describe('GET /api/v1/settings/device-status', () => {
        it('harus mengembalikan daftar status buffer koneksi seluruh device ESP32', async () => {
            mockGetDeviceBufferStatus.mockResolvedValue([
                {
                    deviceId: 'dev-1',
                    deviceCode: 'DEV-01',
                    name: 'Scale 1',
                    status: 'online',
                    minutesSinceLastSeen: 2,
                    isLate: false,
                },
                {
                    deviceId: 'dev-2',
                    deviceCode: 'DEV-02',
                    name: 'Scale 2',
                    status: 'offline',
                    minutesSinceLastSeen: 25,
                    isLate: true,
                },
            ]);

            const res = await request(app).get('/api/v1/settings/device-status');

            expect(res.status).toBe(200);
            expect(res.body.data.devices).toHaveLength(2);
            expect(res.body.data.devices[1].isLate).toBe(true);
            expect(res.body.data.summary.total).toBe(2);
        });
    });
});
