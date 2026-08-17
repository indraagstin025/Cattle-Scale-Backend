import { z } from "zod";

/**
 * Skema validasi registrasi perangkat baru
 */
export const RegisterDeviceSchema = z.object({
  name: z.string().min(1, "Nama perangkat wajib diisi").max(100, "Nama maksimal 100 karakter"),
  location: z.string().max(100, "Lokasi maksimal 100 karakter").optional(),
});

export type RegisterDeviceDto = z.infer<typeof RegisterDeviceSchema>;

/**
 * Skema validasi pembaruan metadata perangkat
 */
export const UpdateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: z.string().max(100).optional(),
});

export type UpdateDeviceDto = z.infer<typeof UpdateDeviceSchema>;
