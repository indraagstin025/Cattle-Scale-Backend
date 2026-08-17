import { jest } from '@jest/globals';
import request from 'supertest';

// ── 1. Mock authApiKey agar request diloloskan dengan dummy device ───────────
const mockDevice = {
    id: 'dev-001',
    deviceCode: 'DEV-SCALE-01',
    name: 'ESP32 Kandang Utama',
};

jest.unstable_mockModule('../../src/middleware/authApiKey.middleware.js', () => ({
    authApiKey: (req: any, _res: any, next: any) => {
        req.device = mockDevice;
        next();
    }
}));

// ── 2. Mock validateRequest ──────────────────────────────────────────────────
jest.unstable_mockModule('../../src/middleware/validateRequest.middleware.js', () => ({
    validateRequest: () => (_req: any, _res: any, next: any) => next()
}));

// ── 3. Mock Service layer ────────────────────────────────────────────────────
const mockProcessWeighIn = jest.fn<any>();
const mockProcessHeartbeat = jest.fn<any>();
const mockGeneratePairingCode = jest.fn<any>();
const mockCheckPairingStatus = jest.fn<any>();
const mockGetLatestActiveFirmware = jest.fn<any>();

jest.unstable_mockModule('../../src/services/WeightLogService.js', () => ({
    WeightLogService: class {
        processWeighIn = mockProcessWeighIn;
    }
}));

jest.unstable_mockModule('../../src/services/DeviceService.js', () => ({
    DeviceService: class {
        processHeartbeat = mockProcessHeartbeat;
    }
}));

jest.unstable_mockModule('../../src/services/PairingService.js', () => ({
    PairingService: class {
        generatePairingCode = mockGeneratePairingCode;
        checkPairingStatus = mockCheckPairingStatus;
    }
}));

jest.unstable_mockModule('../../src/services/FirmwareService.js', () => ({
    FirmwareService: class {
        getLatestActiveFirmware = mockGetLatestActiveFirmware;
    }
}));

// ── 4. Mock Prisma ───────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/config/prisma.config.js', () => ({
    prisma: { $queryRaw: jest.fn<any>() }
}));

// Dynamic import app setelah mock terdefinisi
const { default: app } = await import('../../src/app.js');

describe('Integration: IoT Endpoints (/api/v1/iot)', () => {

    beforeEach(() => jest.clearAllMocks());

    describe('POST /api/v1/iot/heartbeat', () => {
        it('harus menerima metrik heartbeat dan mengembalikan 200', async () => {
            mockProcessHeartbeat.mockResolvedValue(undefined);

            const payload = {
                deviceCode: 'DEV-SCALE-01',
                batteryLevel: 88,
                wifiRssi: -65,
                firmwareVersion: '1.2.0',
            };

            const res = await request(app)
                .post('/api/v1/iot/heartbeat')
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockProcessHeartbeat).toHaveBeenCalledWith(
                'DEV-SCALE-01',
                88,
                -65,
                '1.2.0'
            );
        });
    });

    describe('POST /api/v1/iot/weigh-in', () => {
        it('harus mencatat timbangan sapi dan mengembalikan 201', async () => {
            const mockLog = {
                id: 'log-001',
                cattleId: 'cattle-123',
                weight: 350.5,
                isStable: true,
                weighedAt: new Date(),
            };
            mockProcessWeighIn.mockResolvedValue(mockLog);

            const payload = {
                deviceCode: 'DEV-SCALE-01',
                tagId: 'TAG-123',
                weight: 350.5,
                isStable: true,
                weighedAt: '2026-06-01T10:00:00Z',
                idempotencyKey: 'idemp-001',
            };

            const res = await request(app)
                .post('/api/v1/iot/weigh-in')
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe('log-001');
        });
    });

    describe('POST /api/v1/iot/pairing/generate', () => {
        it('harus menghasilkan kode pairing untuk ESP32 dan mengembalikan 201', async () => {
            mockGeneratePairingCode.mockResolvedValue({
                code: '789123',
                expiresAt: new Date(),
            });

            const res = await request(app)
                .post('/api/v1/iot/pairing/generate')
                .send({ deviceId: 'dev-001' });

            expect(res.status).toBe(201);
            expect(res.body.data.code).toBe('789123');
        });
    });

    describe('GET /api/v1/iot/pairing/status', () => {
        it('harus mengembalikan status verifikasi kode pairing', async () => {
            mockCheckPairingStatus.mockResolvedValue(true);

            const res = await request(app)
                .get('/api/v1/iot/pairing/status?code=789123');

            expect(res.status).toBe(200);
            expect(res.body.data.isValidAndUnused).toBe(true);
        });
    });

    describe('GET /api/v1/iot/firmware/latest', () => {
        it('harus mengembalikan versi firmware OTA terbaru', async () => {
            mockGetLatestActiveFirmware.mockResolvedValue({
                version: '2.0.0',
                binaryUrl: 'https://storage/firmware-2.0.0.bin',
            });

            const res = await request(app).get('/api/v1/iot/firmware/latest');

            expect(res.status).toBe(200);
            expect(res.body.data.version).toBe('2.0.0');
        });
    });
});
