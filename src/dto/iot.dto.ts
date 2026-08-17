import { z } from "zod";

/**
 * Skema validasi payload data timbangan dari ESP32
 */
export const WeighInSchema = z.object({
  deviceCode: z.string().min(1, "deviceCode wajib disertakan"),
  tagId: z.string().min(1, "tagId RFID wajib disertakan"),
  weight: z
    .number({ invalid_type_error: "Nilai berat harus berupa angka" })
    .positive("Berat timbangan harus lebih dari 0 Kg"),
  isStable: z.boolean({ invalid_type_error: "Status kestabilan harus boolean" }),
  weighedAt: z
    .string({ required_error: "weighedAt wajib disertakan" })
    .datetime({ offset: true })
    .transform((val) => new Date(val)),
  batteryLevel: z.number().int().min(0).max(100).optional(),
  wifiRssi: z.number().int().min(-120).max(0).optional(),
  idempotencyKey: z.string().max(100).optional(),
});

export type WeighInDto = z.infer<typeof WeighInSchema>;

/**
 * Skema validasi payload heartbeat (detak telemetri) ESP32
 */
export const HeartbeatSchema = z.object({
  deviceCode: z.string().min(1, "deviceCode wajib disertakan"),
  batteryLevel: z
    .number({ required_error: "batteryLevel wajib diisi" })
    .int()
    .min(0, "Baterai minimal 0%")
    .max(100, "Baterai maksimal 100%"),
  wifiRssi: z
    .number({ required_error: "wifiRssi wajib diisi" })
    .int()
    .min(-120, "RSSI minimal -120 dBm")
    .max(0, "RSSI maksimal 0 dBm"),
  /**
   * Versi firmware yang sedang berjalan di ESP32 (opsional).
   * Jika disertakan, backend akan menyimpannya ke kolom `firmware_version` pada tabel `devices`.
   * Format yang disarankan: SemVer — misal "1.2.3"
   */
  firmwareVersion: z.string().max(20).optional(),
});

export type HeartbeatDto = z.infer<typeof HeartbeatSchema>;
