import { PairingCode, WebSession, Prisma } from '@prisma/client';

export interface IPairingRepository {
  /**
   * Membuat kode unik 6 digit untuk pairing sementara.
   */
  createPairingCode(data: Prisma.PairingCodeUncheckedCreateInput): Promise<PairingCode>;
  
  /**
   * Mencari kode pairing yang valid (belum dipakai & belum kedaluwarsa).
   */
  findValidPairingCode(code: string): Promise<PairingCode | null>;
  
  /**
   * Menandai kode pairing yang sudah dipakai.
   */
  markCodeAsUsed(id: string): Promise<PairingCode>;
  
  /**
   * Membuat sesi dashboard web (session token) baru.
   */
  createSession(data: Prisma.WebSessionUncheckedCreateInput): Promise<WebSession>;
  
  /**
   * Mencari data sesi web menggunakan session token.
   */
  findSessionByToken(token: string): Promise<WebSession | null>;

  /**
   * Mencari data sesi web menggunakan UUID.
   */
  findSessionById(id: string): Promise<WebSession | null>;
  
  /**
   * Mencabut (revoke) sesi web agar tidak bisa diakses lagi.
   */
  revokeSession(id: string): Promise<WebSession>;
  
  /**
   * Mengambil semua sesi web yang masih aktif.
   */
  findAllActiveSessions(): Promise<WebSession[]>;
}
