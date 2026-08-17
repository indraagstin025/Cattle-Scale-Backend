import { Cattle, Prisma } from '@prisma/client';

export interface ICattleRepository {
  /**
   * Mengambil daftar semua sapi dengan filter dan paginasi opsional.
   */
  findAll(params: { skip?: number; take?: number; where?: Prisma.CattleWhereInput; orderBy?: Prisma.CattleOrderByWithRelationInput }): Promise<Cattle[]>;
  
  /**
   * Mencari data sapi berdasarkan UUID.
   */
  findById(id: string): Promise<Cattle | null>;
  
  /**
   * Mencari data sapi berdasarkan nomor tag (RFID/NFC).
   */
  findByTagId(tagId: string): Promise<Cattle | null>;
  
  /**
   * Mendaftarkan sapi baru ke database.
   */
  create(data: Prisma.CattleCreateInput): Promise<Cattle>;
  
  /**
   * Memperbarui profil sapi berdasarkan UUID.
   */
  update(id: string, data: Prisma.CattleUpdateInput): Promise<Cattle>;
  
  /**
   * Menghapus sapi (soft delete) berdasarkan UUID.
   */
  softDelete(id: string): Promise<Cattle>;
}
