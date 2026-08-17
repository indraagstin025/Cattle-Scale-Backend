import { jest } from '@jest/globals';
import request from 'supertest';

// Setup Mock Prisma khusus untuk ping database di health endpoint
const mockQueryRaw = jest.fn<any>();

jest.unstable_mockModule('../../src/config/prisma.config.js', () => ({
    prisma: {
        $queryRaw: mockQueryRaw
    }
}));

// Import dinamis agar menggunakan mock
const { default: app } = await import('../../src/app.js');

describe('Integration: GET /health', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('harus merespons HTTP 200 dan status healthy jika database terkoneksi', async () => {
        mockQueryRaw.mockResolvedValue([{ '?column?': 1 }] as any);

        const response = await request(app).get('/health');
        
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.body.database).toBe('connected');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('timestamp');
        
        expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it('harus merespons HTTP 503 dan status unhealthy jika database down', async () => {
        mockQueryRaw.mockRejectedValue(new Error('Connection refused'));

        const response = await request(app).get('/health');
        
        expect(response.status).toBe(503);
        expect(response.body.status).toBe('unhealthy');
        expect(response.body.database).toBe('disconnected');
        expect(response.body.error).toBe('Connection refused');
        
        expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });
});
