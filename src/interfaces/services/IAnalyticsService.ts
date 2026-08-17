import { GrowthPrediction } from "../../utils/linearRegression.util.js";

export interface IAnalyticsService {
  /**
   * Mengambil ringkasan KPI untuk halaman dashboard utama.
   *
   * @returns Objek berisi:
   * - `totalCattle`: jumlah sapi aktif (non-soft-deleted)
   * - `avgDailyGain`: rata-rata ADG peternakan, dihitung on-the-fly
   * - `offlineDevicesCount`: jumlah perangkat yang tidak berstatus 'online'
   */
  getDashboardOverview(): Promise<{
    totalCattle: number;
    avgDailyGain: number;
    offlineDevicesCount: number;
  }>;

  /**
   * Mengambil tren pertumbuhan historis seekor sapi beserta kalkulasi ADG per sesi.
   * ADG dihitung on-the-fly dari selisih berat antar penimbangan (bukan kolom statis).
   *
   * @param cattleId - UUID sapi
   * @returns Array data timbangan berurutan dari terlama ke terbaru, dilengkapi field ADG
   */
  getCattleGrowthTrend(cattleId: string): Promise<
    Array<{
      id: string;
      weighedAt: Date;
      weight: number;
      isStable: boolean;
      adg: number | null;
      daysSincePrev: number | null;
    }>
  >;

  /**
   * Memprediksi pertumbuhan berat sapi menggunakan Regresi Linear + Ekstrapolasi.
   * Menghasilkan estimasi bobot +30/+60/+90 hari dan estimasi tanggal panen.
   *
   * @param cattleId  - UUID sapi
   * @param daysAhead - Horizon prediksi dalam hari (default: 90 / 3 bulan)
   * @returns {@link GrowthPrediction} berisi regresi, prediksi, dan estimasi panen
   * @throws {Error} Jika sapi tidak ditemukan atau data timbangan < 3 titik
   */
  predictGrowth(cattleId: string, daysAhead?: number): Promise<GrowthPrediction>;

  /**
   * Menghitung performa pertumbuhan rata-rata per ras sapi (ADG)
   * dan membandingkannya dengan standar baku ADG untuk ras tersebut.
   *
   * @returns Array objek perbandingan performa per ras
   */
  getBreedPerformance(): Promise<Array<{
    breed: string;
    cattleCount: number;
    avgAdg: number;
    standardAdg: number;
  }>>;
}
