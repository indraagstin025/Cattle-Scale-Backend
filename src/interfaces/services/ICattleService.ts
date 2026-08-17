import { Cattle, Prisma } from '@prisma/client';
import { CattleWithAge } from '../../services/CattleService.js';

export interface ICattleService {
  /**
   * Mengambil semua daftar sapi berdasarkan filter tertentu.
   * Field `ageMonths` dihitung on-the-fly untuk setiap sapi.
   */
  getAllCattle(filters: any): Promise<CattleWithAge[]>;

  /**
   * Mengambil data sapi beserta riwayat penimbangannya berdasarkan UUID.
   * Field `ageMonths` dihitung on-the-fly dari `birthDate`.
   */
  getCattleById(id: string): Promise<CattleWithAge | null>;

  /**
   * Mendaftarkan profil sapi baru ke dalam sistem.
   */
  registerCattle(data: Prisma.CattleCreateInput): Promise<Cattle>;

  /**
   * Memperbarui detail informasi sapi yang sudah ada.
   */
  updateCattle(id: string, data: Prisma.CattleUpdateInput): Promise<Cattle>;

  /**
   * Menghapus sapi secara logikal (soft delete) dari sistem.
   */
  removeCattle(id: string): Promise<Cattle>;
}
