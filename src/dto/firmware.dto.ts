import { z } from "zod";

/**
 * Skema validasi penerbitan firmware OTA baru
 */
export const PublishFirmwareSchema = z.object({
  version: z
    .string()
    .min(1, "Versi firmware wajib diisi")
    .max(20, "Versi maksimal 20 karakter")
    .regex(/^v?\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/, "Format versi tidak valid (misal: v1.0.0 atau 1.0.0)"),
  binaryUrl: z.string().url("URL file binary firmware harus berupa URL valid"),
  changelog: z.string().optional(),
});

export type PublishFirmwareDto = z.infer<typeof PublishFirmwareSchema>;
