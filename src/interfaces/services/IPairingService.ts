import { PairingCode, WebSession } from '@prisma/client';

export interface IPairingService {
  /**
   * Menggenerasi kode 6 digit baru untuk melakukan pairing perangkat.
   */
  generatePairingCode(deviceId: string): Promise<PairingCode>;
  
  /**
   * Mengecek apakah kode pairing tertentu masih berlaku dan belum digunakan.
   */
  checkPairingStatus(code: string): Promise<boolean>;
  
  /**
   * Memverifikasi kode pairing dari web dan mengembalikan token sesi jika berhasil.
   */
  verifyPairing(code: string, userAgentLabel?: string): Promise<{ sessionToken: string; deviceId: string }>;
  
  /**
   * Mengakhiri / mencabut akses sebuah token sesi secara permanen.
   */
  revokeSession(sessionToken: string): Promise<void>;
  
  /**
   * Mendapatkan daftar semua sesi dashboard web yang sedang aktif.
   */
  getActiveSessions(): Promise<WebSession[]>;

  /**
   * Mencabut sesi tertentu berdasarkan UUID (admin revoke sesi spesifik dari Settings).
   */
  revokeSessionById(sessionId: string): Promise<void>;
}
