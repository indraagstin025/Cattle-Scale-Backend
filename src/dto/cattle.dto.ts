import { z } from "zod";

/**
 * Skema validasi pembuatan data ternak sapi baru
 */
export const CreateCattleSchema = z.object({
  tagId: z.string().min(1, "Tag ID RFID wajib diisi").max(50, "Tag ID maksimal 50 karakter"),
  name: z.string().max(100, "Nama sapi maksimal 100 karakter").optional(),
  breed: z.string().min(1, "Ras sapi wajib diisi").max(50, "Ras maksimal 50 karakter"),
  gender: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Jenis kelamin harus 'male' atau 'female'" }),
  }),
  birthDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"))
    .transform((val) => new Date(val))
    .optional(),
  initialWeight: z
    .number({ invalid_type_error: "Berat awal harus berupa angka" })
    .positive("Berat awal harus lebih dari 0 Kg"),
  targetWeight: z
    .number({ invalid_type_error: "Target berat harus berupa angka" })
    .positive("Target berat harus lebih dari 0 Kg")
    .optional(),
  notes: z.string().optional(),
});

export type CreateCattleDto = z.infer<typeof CreateCattleSchema>;

/**
 * Skema validasi pembaruan data ternak sapi
 */
export const UpdateCattleSchema = z.object({
  name: z.string().max(100).optional(),
  breed: z.string().max(50).optional(),
  gender: z.enum(["male", "female"]).optional(),
  birthDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .transform((val) => new Date(val))
    .optional(),
  initialWeight: z.number().positive().optional(),
  targetWeight: z.number().positive().optional(),
  status: z.enum(["active", "sold", "quarantine", "deceased"]).optional(),
  notes: z.string().optional(),
});

export type UpdateCattleDto = z.infer<typeof UpdateCattleSchema>;

/**
 * Skema validasi query filter pencarian sapi
 */
export const CattleQuerySchema = z.object({
  status: z.enum(["active", "sold", "quarantine", "deceased"]).optional(),
  breed: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CattleQueryDto = z.infer<typeof CattleQuerySchema>;
