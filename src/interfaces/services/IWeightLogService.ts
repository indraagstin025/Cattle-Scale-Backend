import { WeightLog } from '@prisma/client';

export interface IWeightLogService {
  /**
   * Memproses data penimbangan yang dikirim oleh ESP32.
   * Melakukan validasi perangkat, pencarian data sapi, dan menjamin idempotensi data.
   */
  processWeighIn(payload: {
    deviceCode: string;
    tagId: string;
    weight: number;
    isStable: boolean;
    weighedAt: Date;
    idempotencyKey?: string;
  }): Promise<WeightLog>;
  
  /**
   * Mendapatkan riwayat log penimbangan sapi, mendukung rentang waktu (startDate - endDate).
   */
  getHistory(filters: { cattleId?: string; startDate?: Date; endDate?: Date; skip?: number; take?: number }): Promise<WeightLog[]>;
}
