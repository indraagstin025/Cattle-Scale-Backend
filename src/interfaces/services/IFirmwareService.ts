import { FirmwareRelease } from '@prisma/client';

export interface IFirmwareService {
  /**
   * Mendapatkan rilis firmware terbaru yang sedang aktif.
   */
  getLatestActiveFirmware(): Promise<FirmwareRelease | null>;
  
  /**
   * Mempublikasikan rilis firmware baru untuk didownload (OTA) oleh perangkat ESP32.
   */
  publishNewFirmware(version: string, binaryUrl: string, changelog?: string): Promise<FirmwareRelease>;
}
