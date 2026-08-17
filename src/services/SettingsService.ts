import { inject, injectable } from "tsyringe";
import { PrismaClient } from "@prisma/client";
import { SettingsRepository } from "../repositories/SettingsRepository.js";

/**
 * Kunci-kunci resmi yang dikelola oleh `system_settings`.
 * Sentralisasi di sini mencegah typo dan menjadi single source of truth.
 */
export const SETTING_KEYS = {
    FARM_NAME:              "farm_name",
    FARM_LOGO_URL:          "farm_logo_url",
    FARM_TIMEZONE:          "farm_timezone",
    // Spike detection — ambang batas kenaikan berat yang dianggap tidak wajar
    SPIKE_THRESHOLD_KG:     "spike_threshold_kg",     // Nilai Kg max kenaikan per sesi (default: 50)
    SPIKE_WINDOW_SECONDS:   "spike_window_seconds",   // Window waktu untuk deteksi spike (default: 10)
    // Monitoring buffer ESP32
    DEVICE_OFFLINE_WARN_MINUTES: "device_offline_warn_minutes", // Menit sebelum device dianggap "terlambat"
} as const;

/**
 * Nilai default untuk setiap setting kunci.
 * Digunakan jika key belum pernah di-set di database.
 */
const DEFAULTS: Record<string, unknown> = {
    [SETTING_KEYS.FARM_NAME]:                  "Peternakan Saya",
    [SETTING_KEYS.FARM_LOGO_URL]:              null,
    [SETTING_KEYS.FARM_TIMEZONE]:              "Asia/Jakarta",
    [SETTING_KEYS.SPIKE_THRESHOLD_KG]:         50,
    [SETTING_KEYS.SPIKE_WINDOW_SECONDS]:       10,
    [SETTING_KEYS.DEVICE_OFFLINE_WARN_MINUTES]: 15,
};

@injectable()
export class SettingsService {
    constructor(
        @inject(SettingsRepository) private settingsRepo: SettingsRepository,
        @inject("PrismaClient") private prisma: PrismaClient,
    ) {}

    /**
     * Mengambil semua pengaturan dari DB, dilengkapi dengan nilai default
     * untuk key yang belum pernah di-set.
     */
    async getAllSettings(): Promise<Array<{ key: string; value: unknown; description: string | null }>> {
        const dbSettings = await this.settingsRepo.findAll();
        const dbMap = new Map(dbSettings.map((s) => [s.key, s]));

        // Gabungkan key dari SETTING_KEYS dengan data dari DB
        return Object.values(SETTING_KEYS).map((key) => {
            const row = dbMap.get(key);
            return {
                key,
                value: row ? row.value : DEFAULTS[key] ?? null,
                description: row?.description ?? null,
            };
        });
    }

    /**
     * Mengambil satu pengaturan berdasarkan key, dengan fallback ke nilai default.
     */
    async getSetting(key: string): Promise<unknown> {
        const row = await this.settingsRepo.findByKey(key);
        return row ? row.value : (DEFAULTS[key] ?? null);
    }

    /**
     * Menyimpan atau memperbarui satu pengaturan.
     */
    async upsertSetting(key: string, value: unknown, description?: string) {
        // Pastikan key valid
        if (!Object.values(SETTING_KEYS).includes(key as any)) {
            throw new Error(`Key '${key}' tidak dikenal. Gunakan salah satu: ${Object.values(SETTING_KEYS).join(", ")}`);
        }
        return this.settingsRepo.upsert(key, value, description);
    }

    /**
     * Mengambil ambang batas spike detection saat ini.
     * Digunakan oleh WeightLogService untuk memvalidasi data timbangan.
     */
    async getSpikeThreshold(): Promise<{ thresholdKg: number; windowSeconds: number }> {
        const [thresholdKg, windowSeconds] = await Promise.all([
            this.getSetting(SETTING_KEYS.SPIKE_THRESHOLD_KG),
            this.getSetting(SETTING_KEYS.SPIKE_WINDOW_SECONDS),
        ]);
        return {
            thresholdKg: Number(thresholdKg) || 50,
            windowSeconds: Number(windowSeconds) || 10,
        };
    }

    /**
     * Monitoring status koneksi semua device ESP32.
     * Menggunakan `lastSeenAt` dan nilai setting `device_offline_warn_minutes`
     * untuk menghitung apakah device sedang "terlambat" (belum kirim heartbeat).
     *
     * @returns Array status device dengan flag `isLate` dan durasi offline dalam menit
     */
    async getDeviceBufferStatus(): Promise<Array<{
        deviceId: string;
        deviceCode: string;
        name: string;
        status: string;
        firmwareVersion: string | null;
        lastSeenAt: Date | null;
        minutesSinceLastSeen: number | null;
        isLate: boolean;
    }>> {
        const warnMinutes = Number(await this.getSetting(SETTING_KEYS.DEVICE_OFFLINE_WARN_MINUTES)) || 15;

        const devices = await this.prisma.device.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                deviceCode: true,
                name: true,
                status: true,
                firmwareVersion: true,
                lastSeenAt: true,
            },
            orderBy: { lastSeenAt: "asc" }, // Yang paling lama tidak kirim, di atas
        });

        const now = new Date();
        return devices.map((d) => {
            const minutesSinceLastSeen = d.lastSeenAt
                ? Math.round((now.getTime() - d.lastSeenAt.getTime()) / (1000 * 60))
                : null;

            return {
                deviceId: d.id,
                deviceCode: d.deviceCode,
                name: d.name,
                status: d.status,
                firmwareVersion: d.firmwareVersion,
                lastSeenAt: d.lastSeenAt,
                minutesSinceLastSeen,
                isLate: minutesSinceLastSeen !== null && minutesSinceLastSeen >= warnMinutes,
            };
        });
    }
}
