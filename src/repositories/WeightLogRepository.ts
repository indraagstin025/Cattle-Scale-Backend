import { inject, injectable } from 'tsyringe';
import { PrismaClient, WeightLog, Prisma } from '@prisma/client';
import type { IWeightLogRepository } from '../interfaces/repositories/IWeightLogRepository.js';

@injectable()
export class WeightLogRepository implements IWeightLogRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Menyimpan log penimbangan sapi yang dikirimkan oleh ESP32.
   */
  async create(data: Prisma.WeightLogUncheckedCreateInput): Promise<WeightLog> {
    return this.prisma.weightLog.create({ data });
  }

  /**
   * Mencari log berdasarkan kunci idempotensi untuk mencegah duplikasi (koneksi buruk).
   */
  async findByIdempotencyKey(key: string): Promise<WeightLog | null> {
    return this.prisma.weightLog.findUnique({
      where: { idempotencyKey: key },
    });
  }

  /**
   * Mendapatkan daftar riwayat penimbangan dengan filter opsional (seperti rentang tanggal dan limit).
   */
  async findHistory(params: {
    cattleId?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }): Promise<WeightLog[]> {
    const where: Prisma.WeightLogWhereInput = {};
    
    if (params.cattleId) {
      where.cattleId = params.cattleId;
    }
    
    if (params.startDate || params.endDate) {
      where.weighedAt = {};
      if (params.startDate) where.weighedAt.gte = params.startDate;
      if (params.endDate) where.weighedAt.lte = params.endDate;
    }

    return this.prisma.weightLog.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { weighedAt: 'desc' }, // Mengurutkan dari yang terbaru
    });
  }
}
