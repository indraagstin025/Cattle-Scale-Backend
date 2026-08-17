import { WeightLog, Prisma } from '@prisma/client';

export interface IWeightLogRepository {
  /**
   * Menyimpan log penimbangan sapi yang dikirimkan oleh ESP32.
   */
  create(data: Prisma.WeightLogUncheckedCreateInput): Promise<WeightLog>;
  
  /**
   * Mencari log berdasarkan kunci idempotensi untuk mencegah duplikasi (koneksi buruk).
   */
  findByIdempotencyKey(key: string): Promise<WeightLog | null>;
  
  /**
   * Mendapatkan daftar riwayat penimbangan dengan filter opsional (seperti rentang tanggal dan limit).
   */
  findHistory(params: { cattleId?: string; startDate?: Date; endDate?: Date; skip?: number; take?: number }): Promise<WeightLog[]>;
}
