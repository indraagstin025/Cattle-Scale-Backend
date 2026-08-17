import express from 'express';
import request from 'supertest';
import { pairingRateLimiter, generalRateLimiter } from '../../../src/middleware/rateLimiter.middleware.js';

describe('rateLimiter Middleware', () => {

    describe('pairingRateLimiter', () => {
        let app: express.Application;

        beforeEach(() => {
            app = express();
            app.set('trust proxy', true);
            app.post('/test-pairing', pairingRateLimiter, (_req, res) => {
                res.status(200).json({ success: true });
            });
        });

        it('harus membolehkan request di bawah batas maksimum (5x)', async () => {
            const res = await request(app)
                .post('/test-pairing')
                .set('X-Forwarded-For', '192.168.1.50');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('harus memblokir request dengan status 429 jika melebihi batas 5 kali dalam 10 menit', async () => {
            const clientIp = '10.0.0.99';

            // Kirim 5 request pertama (diperbolehkan)
            for (let i = 0; i < 5; i++) {
                await request(app).post('/test-pairing').set('X-Forwarded-For', clientIp);
            }

            // Request ke-6 harus ditolak dengan 429 Too Many Requests
            const blockedRes = await request(app)
                .post('/test-pairing')
                .set('X-Forwarded-For', clientIp);

            expect(blockedRes.status).toBe(429);
            expect(blockedRes.body.success).toBe(false);
            expect(blockedRes.body.retryAfter).toBe(600);
            expect(blockedRes.body.message).toMatch(/Terlalu banyak percobaan/i);
        });
    });

    describe('generalRateLimiter', () => {
        let app: express.Application;

        beforeEach(() => {
            app = express();
            app.get('/test-general', generalRateLimiter, (_req, res) => {
                res.status(200).json({ status: 'ok' });
            });
        });

        it('harus meloloskan request normal', async () => {
            const res = await request(app).get('/test-general');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });
});
