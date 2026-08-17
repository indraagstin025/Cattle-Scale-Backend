import { z } from "zod";

/**
 * Skema validasi request generate kode pairing dari ESP32
 */
export const GeneratePairingCodeSchema = z.object({
  deviceId: z.string().uuid("Format deviceId harus berupa UUID valid"),
});

export type GeneratePairingCodeDto = z.infer<typeof GeneratePairingCodeSchema>;

/**
 * Skema validasi query polling status pairing
 */
export const CheckPairingStatusQuerySchema = z.object({
  code: z.string().min(4, "Kode pairing minimal 4 karakter").max(10, "Kode pairing maksimal 10 karakter"),
});

export type CheckPairingStatusQueryDto = z.infer<typeof CheckPairingStatusQuerySchema>;

/**
 * Skema validasi verifikasi kode pairing dari Web Dashboard
 */
export const VerifyPairingSchema = z.object({
  code: z.string().min(4, "Kode pairing minimal 4 karakter").max(10, "Kode pairing maksimal 10 karakter"),
  userAgentLabel: z.string().max(100, "Label browser/perangkat maksimal 100 karakter").optional(),
});

export type VerifyPairingDto = z.infer<typeof VerifyPairingSchema>;

/**
 * Skema validasi revoke sesi web
 */
export const RevokeSessionSchema = z.object({
  sessionToken: z.string().min(1, "sessionToken wajib diisi"),
});

export type RevokeSessionDto = z.infer<typeof RevokeSessionSchema>;
