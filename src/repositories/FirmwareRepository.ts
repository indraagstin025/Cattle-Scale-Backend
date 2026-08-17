import { inject, injectable } from 'tsyringe';
import { PrismaClient, FirmwareRelease, Prisma } from '@prisma/client';
import type { IFirmwareRepository } from '../interfaces/repositories/IFirmwareRepository.js';

@injectable()
export class FirmwareRepository implements IFirmwareRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Mengambil versi firmware yang saat ini sedang aktif (is_active = true).
   */
  async getActiveFirmware(): Promise<FirmwareRelease | null> {
    return this.prisma.firmwareRelease.findFirst({
      where: { isActive: true },
      orderBy: { releasedAt: 'desc' },
    });
  }

  /**
   * Membuat rekaman rilis firmware baru di database.
   */
  async createRelease(data: Prisma.FirmwareReleaseCreateInput): Promise<FirmwareRelease> {
    return this.prisma.firmwareRelease.create({ data });
  }

  /**
   * Menonaktifkan semua firmware yang sebelumnya berstatus aktif.
   * Dipanggil sebelum merilis firmware baru agar hanya 1 yang aktif.
   */
  async deactivateAll(): Promise<void> {
    await this.prisma.firmwareRelease.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }
}
