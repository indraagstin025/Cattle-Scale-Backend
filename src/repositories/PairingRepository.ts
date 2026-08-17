import { inject, injectable } from 'tsyringe';
import { PrismaClient, PairingCode, WebSession, Prisma } from '@prisma/client';
import type { IPairingRepository } from '../interfaces/repositories/IPairingRepository.js';

@injectable()
export class PairingRepository implements IPairingRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Membuat kode unik 6 digit untuk pairing sementara.
   */
  async createPairingCode(data: Prisma.PairingCodeUncheckedCreateInput): Promise<PairingCode> {
    return this.prisma.pairingCode.create({ data });
  }

  /**
   * Mencari kode pairing yang valid (belum dipakai & belum kedaluwarsa).
   */
  async findValidPairingCode(code: string): Promise<PairingCode | null> {
    return this.prisma.pairingCode.findFirst({
      where: {
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Menandai kode pairing yang sudah dipakai.
   */
  async markCodeAsUsed(id: string): Promise<PairingCode> {
    return this.prisma.pairingCode.update({
      where: { id },
      data: { used: true },
    });
  }

  /**
   * Membuat sesi dashboard web (session token) baru.
   */
  async createSession(data: Prisma.WebSessionUncheckedCreateInput): Promise<WebSession> {
    return this.prisma.webSession.create({ data });
  }

  /**
   * Mencari data sesi web menggunakan session token.
   */
  async findSessionByToken(token: string): Promise<WebSession | null> {
    return this.prisma.webSession.findUnique({
      where: { sessionToken: token },
    });
  }

  /**
   * Mencari data sesi web menggunakan UUID.
   */
  async findSessionById(id: string): Promise<WebSession | null> {
    return this.prisma.webSession.findUnique({
      where: { id },
    });
  }

  /**
   * Mencabut (revoke) sesi web agar tidak bisa diakses lagi.
   */
  async revokeSession(id: string): Promise<WebSession> {
    return this.prisma.webSession.update({
      where: { id },
      data: { revoked: true },
    });
  }

  /**
   * Mengambil semua sesi web yang masih aktif.
   */
  async findAllActiveSessions(): Promise<WebSession[]> {
    return this.prisma.webSession.findMany({
      where: { revoked: false },
      include: { pairedDevice: true },
      orderBy: { lastActiveAt: 'desc' },
    });
  }
}
