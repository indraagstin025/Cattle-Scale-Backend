import { FirmwareRelease, Prisma } from '@prisma/client';

export interface IFirmwareRepository {
  /**
   * Mengambil versi firmware yang saat ini sedang aktif (is_active = true).
   */
  getActiveFirmware(): Promise<FirmwareRelease | null>;
  
  /**
   * Membuat rekaman rilis firmware baru di database.
   */
  createRelease(data: Prisma.FirmwareReleaseCreateInput): Promise<FirmwareRelease>;
  
  /**
   * Menonaktifkan semua firmware yang sebelumnya berstatus aktif.
   * Dipanggil sebelum merilis firmware baru agar hanya 1 yang aktif.
   */
  deactivateAll(): Promise<void>;
}
