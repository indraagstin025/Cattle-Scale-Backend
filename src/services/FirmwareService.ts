import { inject, injectable } from 'tsyringe';
import { FirmwareRelease } from '@prisma/client';
import type { IFirmwareService } from '../interfaces/services/IFirmwareService.js';
import type { IFirmwareRepository } from '../interfaces/repositories/IFirmwareRepository.js';

@injectable()
export class FirmwareService implements IFirmwareService {
  constructor(
    @inject('IFirmwareRepository') private firmwareRepo: IFirmwareRepository
  ) {}

  /**
   * Mendapatkan rilis firmware terbaru yang sedang aktif.
   */
  async getLatestActiveFirmware(): Promise<FirmwareRelease | null> {
    return this.firmwareRepo.getActiveFirmware();
  }

  /**
   * Mempublikasikan rilis firmware baru untuk didownload (OTA) oleh perangkat ESP32.
   */
  async publishNewFirmware(version: string, binaryUrl: string, changelog?: string): Promise<FirmwareRelease> {
    await this.firmwareRepo.deactivateAll();
    
    return this.firmwareRepo.createRelease({
      version,
      binaryUrl,
      changelog,
      isActive: true
    });
  }
}
