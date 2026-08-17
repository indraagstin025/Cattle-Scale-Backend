import { inject, injectable } from "tsyringe";
import type { IAnalyticsService } from "../interfaces/services/IAnalyticsService.js";
import type { IWeightLogRepository } from "../interfaces/repositories/IWeightLogRepository.js";
import type { ICattleRepository } from "../interfaces/repositories/ICattleRepository.js";
import type { IDeviceRepository } from "../interfaces/repositories/IDeviceRepository.js";
import { buildGrowthPrediction, GrowthPrediction, RegressionPoint } from "../utils/linearRegression.util.js";
import { getStandardAdgForBreed } from "../utils/breedStandards.util.js";

@injectable()
export class AnalyticsService implements IAnalyticsService {
    constructor(
        @inject("IWeightLogRepository") private weightLogRepo: IWeightLogRepository,
        @inject("ICattleRepository") private cattleRepo: ICattleRepository,
        @inject("IDeviceRepository") private deviceRepo: IDeviceRepository
    ) { }

    /**
    * Mengambil ringkasan KPI untuk halaman dashboard utama.
    *
    * Kalkulasi yang dilakukan:
    * - `totalCattle`: jumlah sapi aktif (non-soft-deleted)
    * - `avgDailyGain`: rata-rata ADG peternakan, dihitung on-the-fly dari selisih
    *    2 timbangan terakhir setiap sapi (bukan dari kolom statis)
    * - `offlineDevicesCount`: jumlah perangkat dengan status bukan 'online'
    *
    * @returns Objek KPI ringkasan peternakan
    */
    async getDashboardOverview(): Promise<{ totalCattle: number; avgDailyGain: number; offlineDevicesCount: number; }> {
        const allCattle = await this.cattleRepo.findAll({
            where: { deletedAt: null },
        });
        const totalCattle = allCattle.length;

        let totalAdg = 0;
        let cattlewithAdg = 0;

        for (const cattle of allCattle) {
            const logs = await this.weightLogRepo.findHistory({
                cattleId: cattle.id,
                take: 2,
            });

            if (logs.length >= 2) {
                const latesWeight = Number(logs[0].weight);
                const prevWeight = Number(logs[1].weight);
                const daysBetween =
                    (logs[0].weighedAt.getTime() - logs[1].weighedAt.getTime()) / (1000 * 60 * 60 * 24);

                if (daysBetween > 0) {
                    totalAdg += (latesWeight - prevWeight) / daysBetween;
                    cattlewithAdg++;
                }
            }
        }

        const avgDailyGain = cattlewithAdg > 0 ? parseFloat((totalAdg / cattlewithAdg).toFixed(2)) : 0;
        const allDevices = await this.deviceRepo.findAll();
        const offlineDevicesCount = allDevices.filter(
            (d) => d.status !== "online"
        ).length;

        return { totalCattle, avgDailyGain, offlineDevicesCount };
    }

    /**
       * Mengambil tren pertumbuhan historis seekor sapi beserta kalkulasi ADG per sesi.
       *
       * ADG dihitung on-the-fly (bukan dari kolom statis) menggunakan selisih berat
       * antara dua penimbangan berurutan dibagi jumlah hari di antaranya:
       * ```
       * ADG = (berat_terkini - berat_sebelumnya) / jumlah_hari
       * ```
       *
       * @param cattleId - UUID sapi yang ingin dilihat tren pertumbuhannya
       * @returns Array data timbangan berurutan dari terlama ke terbaru, dengan field ADG
       */
    async getCattleGrowthTrend(cattleId: string): Promise<
        Array<{
            id: string;
            weighedAt: Date;
            weight: number;
            isStable: boolean;
            adg: number | null;
            daysSincePrev: number | null;
        }>
    > {
        const logs = await this.weightLogRepo.findHistory({
            cattleId,
            take: 100,
        });
        const chronological = [...logs].reverse();
        return chronological.map((log, index) => {
            let adg: number | null = null;
            let daysSincePrev: number | null = null;
            if (index > 0) {
                const prev = chronological[index - 1];
                daysSincePrev =
                    (log.weighedAt.getTime() - prev.weighedAt.getTime()) /
                    (1000 * 60 * 60 * 24);
                if (daysSincePrev > 0) {
                    adg = parseFloat(
                        ((Number(log.weight) - Number(prev.weight)) / daysSincePrev).toFixed(3)
                    );
                }
            }
            return {
                id: log.id,
                weighedAt: log.weighedAt,
                weight: Number(log.weight),
                isStable: log.isStable,
                adg,
                daysSincePrev: daysSincePrev
                    ? parseFloat(daysSincePrev.toFixed(1))
                    : null,
            };
        });
    }
    /**
     * Memprediksi pertumbuhan berat sapi menggunakan Regresi Linear + Ekstrapolasi.
     *
     * Alur:
     * 1. Ambil data historis timbangan (minimal 3 titik dari ~2 bulan)
     * 2. Konversi ke titik regresi (x = hari relatif sejak timbangan pertama, y = berat Kg)
     * 3. Jalankan OLS → dapatkan slope (ADG regresi), intercept, R²
     * 4. Ekstrapolasi → prediksi berat +30, +60, +90 hari ke depan
     * 5. Inverse prediction → estimasi tanggal panen dari target_weight sapi
     *
     * @param cattleId  - UUID sapi
     * @param daysAhead - Horizon prediksi dalam hari (default: 90 / 3 bulan)
     * @returns Objek GrowthPrediction lengkap dari `linearRegression.util.ts`
     * @throws {Error} Jika sapi tidak ditemukan
     * @throws {Error} Jika data timbangan < 3 titik
     */
    async predictGrowth(cattleId: string, daysAhead: number = 90): Promise<GrowthPrediction> {
        const cattle = await this.cattleRepo.findById(cattleId);
        if (!cattle) throw new Error(`Sapi dengan ID '${cattleId}' tidak ditemukan.`);

        const logs = await this.weightLogRepo.findHistory({ cattleId, take: 50 });
        const chronological = [...logs].reverse();
        const regressionPoints: RegressionPoint[] = chronological.map((log, index) => ({

            x: index === 0
                ? 0
                : (log.weighedAt.getTime() - chronological[0].weighedAt.getTime()) /
                (1000 * 60 * 60 * 24),
            y: Number(log.weight),
        }));

        const targetWeight = cattle.targetWeight
          ? Number(cattle.targetWeight)
          : undefined;

        return buildGrowthPrediction(regressionPoints, targetWeight, daysAhead);
    }

    /**
     * Menghitung performa pertumbuhan rata-rata per ras sapi (ADG)
     * dan membandingkannya dengan standar baku ADG untuk ras tersebut.
     *
     * @returns Array objek perbandingan performa per ras
     */
    async getBreedPerformance(): Promise<Array<{
        breed: string;
        cattleCount: number;
        avgAdg: number;
        standardAdg: number;
    }>> {
        const allCattle = await this.cattleRepo.findAll({
            where: { deletedAt: null },
        });

        const breedGroups: Record<string, { totalAdg: number; validCattleCount: number; totalCattle: number }> = {};

        for (const cattle of allCattle) {
            const breed = cattle.breed || "Unknown";
            if (!breedGroups[breed]) {
                breedGroups[breed] = { totalAdg: 0, validCattleCount: 0, totalCattle: 0 };
            }
            breedGroups[breed].totalCattle++;

            // Hitung ADG terkini (dari 2 penimbangan terakhir)
            const logs = await this.weightLogRepo.findHistory({
                cattleId: cattle.id,
                take: 2,
            });

            if (logs.length >= 2) {
                const latestWeight = Number(logs[0].weight);
                const prevWeight = Number(logs[1].weight);
                const daysBetween = (logs[0].weighedAt.getTime() - logs[1].weighedAt.getTime()) / (1000 * 60 * 60 * 24);

                if (daysBetween > 0) {
                    breedGroups[breed].totalAdg += (latestWeight - prevWeight) / daysBetween;
                    breedGroups[breed].validCattleCount++;
                }
            }
        }

        const result = Object.entries(breedGroups).map(([breed, stats]) => {
            const avgAdg = stats.validCattleCount > 0 
                ? parseFloat((stats.totalAdg / stats.validCattleCount).toFixed(2)) 
                : 0;
                
            return {
                breed,
                cattleCount: stats.totalCattle,
                avgAdg,
                standardAdg: getStandardAdgForBreed(breed)
            };
        });

        // Urutkan berdasarkan performa tertinggi
        return result.sort((a, b) => b.avgAdg - a.avgAdg);
    }
}