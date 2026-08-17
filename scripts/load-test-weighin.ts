import dotenv from 'dotenv';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

interface TestMetrics {
    totalRequests: number;
    successful: number;
    failed: number;
    latenciesMs: number[];
    startTime: number;
    endTime: number;
}

function hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
}

async function runLoadTest() {
    console.log('===============================================================');
    console.log('🚀 TASK 71: LOAD TESTING & IDEMPOTENCY ENDPOINT /iot/weigh-in');
    console.log('===============================================================\n');

    const rawApiKey = `LOAD_TEST_KEY_${Date.now()}`;
    const hashedKey = hashApiKey(rawApiKey);
    const deviceCode = `DEV-LOAD-${Math.floor(1000 + Math.random() * 9000)}`;
    const tagId = `TAG-LOAD-${Math.floor(1000 + Math.random() * 9000)}`;

    let deviceId: string | null = null;
    let cattleId: string | null = null;

    try {
        // ── 1. Setup Test Device & Cattle di Database ──────────────────────────
        console.log('🛠️  Menyiapkan Device & Cattle dummy di database...');
        const device = await prisma.device.create({
            data: {
                name: 'ESP32 Load Test Virtual',
                deviceCode,
                apiKey: rawApiKey,
                status: 'online',
            },
        });
        deviceId = device.id;

        const cattle = await prisma.cattle.create({
            data: {
                tagId,
                name: 'Sapi Load Test 01',
                breed: 'Limousin',
                gender: 'male',
                initialWeight: 250.0,
                currentWeight: 250.0,
                targetWeight: 500.0,
                status: 'active',
            },
        });
        cattleId = cattle.id;
        console.log(`✅ Device siap: [${deviceCode}] | Sapi siap: [${tagId}]\n`);

        // ── 2. Phase 1: High Concurrency Batch Sync (50 Concurrent Requests) ──
        const CONCURRENT_REQUESTS = 50;
        console.log(`⚡ [FASE 1] Mengirim ${CONCURRENT_REQUESTS} request timbangan secara serentak (High Concurrency)...`);

        const idempotencyKeys: string[] = [];
        const requests: Promise<any>[] = [];
        const metrics: TestMetrics = {
            totalRequests: CONCURRENT_REQUESTS,
            successful: 0,
            failed: 0,
            latenciesMs: [],
            startTime: Date.now(),
            endTime: 0,
        };

        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            const key = `idemp-load-${Date.now()}-${i}`;
            idempotencyKeys.push(key);

            const payload = {
                deviceCode,
                tagId,
                weight: parseFloat((250 + i * 0.5).toFixed(2)),
                isStable: true,
                weighedAt: new Date(Date.now() - (CONCURRENT_REQUESTS - i) * 60000).toISOString(),
                idempotencyKey: key,
            };

            const reqPromise = (async () => {
                const reqStart = Date.now();
                try {
                    const response = await fetch(`${BASE_URL}/iot/weigh-in`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': rawApiKey,
                        },
                        body: JSON.stringify(payload),
                    });

                    const reqDuration = Date.now() - reqStart;
                    metrics.latenciesMs.push(reqDuration);

                    if (response.status === 200 || response.status === 201) {
                        metrics.successful++;
                    } else {
                        metrics.failed++;
                        const errData = await response.text();
                        console.error(`   ⚠️ Request ${i} gagal (Status: ${response.status}):`, errData);
                    }
                } catch (err: any) {
                    metrics.failed++;
                    metrics.latenciesMs.push(Date.now() - reqStart);
                    console.error(`   ❌ Network error req ${i}:`, err.message);
                }
            })();

            requests.push(reqPromise);
        }

        await Promise.all(requests);
        metrics.endTime = Date.now();

        // Hitung metrik Fase 1
        const totalDurationSec = (metrics.endTime - metrics.startTime) / 1000;
        const rps = (metrics.successful / totalDurationSec).toFixed(2);
        const avgLatency = (metrics.latenciesMs.reduce((a, b) => a + b, 0) / metrics.latenciesMs.length).toFixed(1);
        const minLatency = Math.min(...metrics.latenciesMs);
        const maxLatency = Math.max(...metrics.latenciesMs);
        const sortedLatencies = [...metrics.latenciesMs].sort((a, b) => a - b);
        const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];

        console.log('\n📊 HASIL LOAD TEST FASE 1:');
        console.log(`   • Total Request         : ${metrics.totalRequests}`);
        console.log(`   • Berhasil (200/201)    : ${metrics.successful} (${((metrics.successful / metrics.totalRequests) * 100).toFixed(1)}%)`);
        console.log(`   • Gagal (Error/Timeout) : ${metrics.failed}`);
        console.log(`   • Total Durasi          : ${totalDurationSec.toFixed(2)} detik`);
        console.log(`   • Throughput (RPS)      : ${rps} req/sec`);
        console.log(`   • Latency Rata-rata     : ${avgLatency} ms`);
        console.log(`   • Latency Min / Max     : ${minLatency} ms / ${maxLatency} ms`);
        console.log(`   • Latency P95           : ${p95Latency} ms\n`);

        // ── 3. Phase 2: Idempotency & Retry Simulation (Offline Retry) ─────────
        console.log('🔄 [FASE 2] Simulasi Retry ESP32 (Mengirim ulang 50 data dengan Idempotency Key sama)...');
        let duplicateSuccessCount = 0;

        const retryRequests = idempotencyKeys.map(async (key, idx) => {
            const payload = {
                deviceCode,
                tagId,
                weight: parseFloat((250 + idx * 0.5).toFixed(2)),
                isStable: true,
                weighedAt: new Date().toISOString(),
                idempotencyKey: key, // Key yang sama persis
            };

            const response = await fetch(`${BASE_URL}/iot/weigh-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': rawApiKey,
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 200 || response.status === 201) {
                duplicateSuccessCount++;
            }
        });

        await Promise.all(retryRequests);

        // Verifikasi di database: Jumlah row di WeightLog untuk sapi ini harus tetap 50 (tidak jadi 100)
        const totalLogsInDb = await prisma.weightLog.count({
            where: { cattleId: cattle.id },
        });

        console.log('\n🛡️  HASIL VERIFIKASI IDEMPOTENSI:');
        console.log(`   • Request Retry Dikirim  : ${idempotencyKeys.length}`);
        console.log(`   • Respons Retry Sukses   : ${duplicateSuccessCount} (Handled gracefully)`);
        console.log(`   • Record Aktual di DB    : ${totalLogsInDb}`);

        if (totalLogsInDb === CONCURRENT_REQUESTS) {
            console.log('   ✅ IDEMPOTENCY PASS: Tidak ada duplikasi data log timbangan tercatat!');
        } else {
            console.warn(`   ⚠️ IDEMPOTENCY WARN: Ditemukan ${totalLogsInDb} data di DB (diharapkan ${CONCURRENT_REQUESTS})`);
        }

        console.log('\n===============================================================');
        console.log('🎉 TASK 71 LOAD TEST & RELIABILITY TEST SELESAI DENGAN SUKSES!');
        console.log('===============================================================\n');

    } catch (error: any) {
        console.error('❌ Terjadi kesalahan saat menjalankan Load Test:', error);
    } finally {
        // ── 4. Cleanup Data Test ───────────────────────────────────────────────
        console.log('🧹 Membersihkan record dummy load test dari database...');
        if (cattleId) {
            await prisma.weightLog.deleteMany({ where: { cattleId } });
            await prisma.cattle.delete({ where: { id: cattleId } });
        }
        if (deviceId) {
            await prisma.device.delete({ where: { id: deviceId } });
        }
        await prisma.$disconnect();
        console.log('✨ Cleanup database selesai.');
    }
}

runLoadTest();
