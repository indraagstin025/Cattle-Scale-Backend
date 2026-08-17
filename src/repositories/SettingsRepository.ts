import { inject, injectable } from "tsyringe";
import { PrismaClient, SystemSetting } from "@prisma/client";

@injectable()
export class SettingsRepository {
    constructor(@inject("PrismaClient") private prisma: PrismaClient) {}

    /**
     * Mengambil semua pengaturan sistem.
     */
    async findAll(): Promise<SystemSetting[]> {
        return this.prisma.systemSetting.findMany({
            orderBy: { key: "asc" },
        });
    }

    /**
     * Mencari satu pengaturan berdasarkan key.
     */
    async findByKey(key: string): Promise<SystemSetting | null> {
        return this.prisma.systemSetting.findUnique({ where: { key } });
    }

    /**
     * Membuat atau memperbarui pengaturan (upsert by key).
     */
    async upsert(key: string, value: unknown, description?: string): Promise<SystemSetting> {
        return this.prisma.systemSetting.upsert({
            where: { key },
            update: { value, description } as any,
            create: { key, value, description } as any,
        });
    }

    /**
     * Menghapus pengaturan berdasarkan key.
     */
    async delete(key: string): Promise<SystemSetting> {
        return this.prisma.systemSetting.delete({ where: { key } });
    }
}
