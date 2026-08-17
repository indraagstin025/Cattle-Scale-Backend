import { inject, injectable } from 'tsyringe';
import { Cattle, Prisma } from '@prisma/client';
import type { ICattleService } from '../interfaces/services/ICattleService.js';
import type { ICattleRepository } from '../interfaces/repositories/ICattleRepository.js';

/**
 * Representasi data sapi yang sudah diperkaya dengan field kalkulasi on-the-fly.
 * Field `ageMonths` dihitung dari `birthDate` saat request, bukan disimpan statis di DB.
 */
export type CattleWithAge = Cattle & {
    /** Umur sapi dalam bulan, dihitung on-the-fly dari `birthDate`. Null jika `birthDate` tidak diisi. */
    ageMonths: number | null;
};

/**
 * Menghitung umur sapi dalam bulan dari tanggal lahir hingga hari ini.
 *
 * @param birthDate - Tanggal lahir sapi (dari field `birthDate` Prisma)
 * @returns Jumlah bulan (integer) sejak lahir, atau `null` jika `birthDate` tidak tersedia
 */
function calculateAgeMonths(birthDate: Date | null): number | null {
    if (!birthDate) return null;

    const now = new Date();
    const years = now.getFullYear() - birthDate.getFullYear();
    const months = now.getMonth() - birthDate.getMonth();

    // Total bulan, dikurangi 1 jika hari saat ini belum melewati hari lahir di bulan ini
    const totalMonths = years * 12 + months - (now.getDate() < birthDate.getDate() ? 1 : 0);

    return Math.max(0, totalMonths); // Tidak boleh negatif
}

/**
 * Memperkaya satu objek Cattle dengan field `ageMonths` yang dihitung on-the-fly.
 *
 * @param cattle - Objek Cattle dari Prisma
 * @returns Objek Cattle yang sudah ditambah field `ageMonths`
 */
function enrichWithAge(cattle: Cattle): CattleWithAge {
    return {
        ...cattle,
        ageMonths: calculateAgeMonths(cattle.birthDate),
    };
}

@injectable()
export class CattleService implements ICattleService {
    constructor(
        @inject('ICattleRepository') private cattleRepository: ICattleRepository
    ) { }

    /**
     * Mengambil semua daftar sapi berdasarkan filter tertentu.
     * Field `ageMonths` dihitung on-the-fly untuk setiap sapi.
     */
    async getAllCattle(filters?: any): Promise<CattleWithAge[]> {
        const cattle = await this.cattleRepository.findAll(filters || {});
        return cattle.map(enrichWithAge);
    }

    /**
     * Mengambil data sapi beserta riwayat penimbangannya berdasarkan UUID.
     * Field `ageMonths` dihitung on-the-fly dari `birthDate`.
     *
     * @param id - UUID sapi
     * @returns Data sapi yang diperkaya dengan `ageMonths`, atau null jika tidak ditemukan
     */
    async getCattleById(id: string): Promise<CattleWithAge | null> {
        const cattle = await this.cattleRepository.findById(id);
        if (!cattle) return null;
        return enrichWithAge(cattle);
    }

    /**
     * Mendaftarkan profil sapi baru ke dalam sistem.
     */
    async registerCattle(data: Prisma.CattleCreateInput): Promise<Cattle> {
        return this.cattleRepository.create(data);
    }

    /**
     * Memperbarui detail informasi sapi yang sudah ada.
     */
    async updateCattle(id: string, data: Prisma.CattleUpdateInput): Promise<Cattle> {
        return this.cattleRepository.update(id, data);
    }

    /**
     * Menghapus sapi secara logikal (soft delete) dari sistem.
     */
    async removeCattle(id: string): Promise<Cattle> {
        return this.cattleRepository.softDelete(id);
    }
}
