import { inject, injectable } from 'tsyringe';
import { PrismaClient, Cattle, Prisma } from '@prisma/client';
import type { ICattleRepository } from '../interfaces/repositories/ICattleRepository.js';

@injectable()
export class CattleRepository implements ICattleRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Mengambil daftar semua sapi dengan filter dan paginasi opsional.
   */
  async findAll(params: { skip?: number; take?: number; where?: Prisma.CattleWhereInput; orderBy?: Prisma.CattleOrderByWithRelationInput }): Promise<Cattle[]> {
    return this.prisma.cattle.findMany(params);
  }

  /**
   * Mencari data sapi berdasarkan UUID.
   */
  async findById(id: string): Promise<Cattle | null> {
    return this.prisma.cattle.findUnique({ where: { id } });
  }

  /**
   * Mencari data sapi berdasarkan nomor tag (RFID/NFC).
   */
  async findByTagId(tagId: string): Promise<Cattle | null> {
    return this.prisma.cattle.findUnique({ where: { tagId } });
  }

  /**
   * Mendaftarkan sapi baru ke database.
   */
  async create(data: Prisma.CattleCreateInput): Promise<Cattle> {
    return this.prisma.cattle.create({ data });
  }

  /**
   * Memperbarui profil sapi berdasarkan UUID.
   */
  async update(id: string, data: Prisma.CattleUpdateInput): Promise<Cattle> {
    return this.prisma.cattle.update({ where: { id }, data });
  }

  /**
   * Menghapus sapi (soft delete) berdasarkan UUID.
   */
  async softDelete(id: string): Promise<Cattle> {
    return this.prisma.cattle.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deceased' }, // Status default saat dihapus
    });
  }
}
