import { inject, injectable } from 'tsyringe';
import { PrismaClient, Device, Prisma } from '@prisma/client';
import type { IDeviceRepository } from '../interfaces/repositories/IDeviceRepository.js';

@injectable()
export class DeviceRepository implements IDeviceRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Mengambil semua perangkat.
   */
  async findAll(): Promise<Device[]> {
    return this.prisma.device.findMany();
  }

  /**
   * Mencari perangkat berdasarkan UUID.
   */
  async findById(id: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { id } });
  }

  /**
   * Mencari perangkat berdasarkan API Key (hashed).
   */
  async findByApiKey(apiKey: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { apiKey } });
  }

  /**
   * Mencari perangkat berdasarkan kode unik (misal: DEV-A1B2C3).
   */
  async findByDeviceCode(deviceCode: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { deviceCode } });
  }

  /**
   * Mendaftarkan perangkat baru.
   */
  async create(data: Prisma.DeviceCreateInput): Promise<Device> {
    return this.prisma.device.create({ data });
  }

  /**
   * Memperbarui data perangkat.
   */
  async update(id: string, data: Prisma.DeviceUpdateInput): Promise<Device> {
    return this.prisma.device.update({ where: { id }, data });
  }

  /**
   * Memperbarui status online/offline, statistik baterai, dan versi firmware dari perangkat.
   * `firmwareVersion` bersifat opsional — hanya di-update jika nilai dikirimkan oleh ESP32.
   */
  async updateHeartbeat(
    id: string,
    data: { batteryLevel: number; wifiRssi: number; status: string; firmwareVersion?: string }
  ): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        batteryLevel: data.batteryLevel,
        wifiRssi: data.wifiRssi,
        status: data.status,
        lastSeenAt: new Date(),
        // Hanya perbarui firmware_version jika nilainya dikirimkan oleh ESP32
        ...(data.firmwareVersion !== undefined && { firmwareVersion: data.firmwareVersion }),
      },
    });
  }
}
