import { inject, injectable } from 'tsyringe';
import { PairingCode, WebSession } from '@prisma/client';
import { randomInt } from 'crypto';
import type { IPairingService } from '../interfaces/services/IPairingService.js';
import type { IPairingRepository } from '../interfaces/repositories/IPairingRepository.js';

@injectable()
export class PairingService implements IPairingService {
  constructor(
    @inject('IPairingRepository') private pairingRepo: IPairingRepository
  ) {}

  /**
   * Menggenerasi kode 6 digit baru untuk melakukan pairing perangkat.
   */
  async generatePairingCode(deviceId: string): Promise<PairingCode> {
    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    return this.pairingRepo.createPairingCode({
      code,
      deviceId,
      expiresAt
    });
  }

  /**
   * Mengecek apakah kode pairing tertentu masih berlaku dan belum digunakan.
   */
  async checkPairingStatus(code: string): Promise<boolean> {
    const pairing = await this.pairingRepo.findValidPairingCode(code);
    return pairing ? !pairing.used : false;
  }

  /**
   * Memverifikasi kode pairing dari web dan mengembalikan token sesi jika berhasil.
   */
  async verifyPairing(code: string, userAgentLabel?: string): Promise<{ sessionToken: string; deviceId: string }> {
    const validCode = await this.pairingRepo.findValidPairingCode(code);
    if (!validCode) throw new Error("Kode pairing tidak valid atau sudah kedaluwarsa");

    await this.pairingRepo.markCodeAsUsed(validCode.id);
    const sessionToken = `sess_${validCode.deviceId}_${Date.now()}`;

    await this.pairingRepo.createSession({
      sessionToken,
      label: userAgentLabel || 'Web Dashboard',
      pairedDeviceId: validCode.deviceId
    });

    return { sessionToken, deviceId: validCode.deviceId };
  }

  /**
   * Mengakhiri / mencabut akses sebuah token sesi secara permanen.
   */
  async revokeSession(sessionToken: string): Promise<void> {
    const session = await this.pairingRepo.findSessionByToken(sessionToken);
    if (session) {
      await this.pairingRepo.revokeSession(session.id);
    }
  }

  /**
   * Mendapatkan daftar semua sesi dashboard web yang sedang aktif.
   */
  async getActiveSessions(): Promise<WebSession[]> {
    return this.pairingRepo.findAllActiveSessions();
  }

  /**
   * Mencabut sesi tertentu berdasarkan ID (digunakan oleh admin untuk
   * merevoke sesi spesifik dari halaman Settings).
   *
   * @param sessionId - UUID dari WebSession yang ingin di-revoke
   * @throws {Error} Jika sesi dengan ID tersebut tidak ditemukan
   */
  async revokeSessionById(sessionId: string): Promise<void> {
    const session = await this.pairingRepo.findSessionById(sessionId);
    if (!session) throw new Error(`Sesi dengan ID '${sessionId}' tidak ditemukan.`);
    await this.pairingRepo.revokeSession(session.id);
  }
}
