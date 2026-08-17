import { Request, Response, NextFunction } from "express";
import { container } from "../container/container.js";
import type { IPairingRepository } from "../interfaces/repositories/IPairingRepository.js";

/**
 * Middleware autentikasi berbasis session cookie untuk endpoint Web Dashboard.
 *
 * Cara kerja:
 * 1. Membaca cookie `session_token` (httpOnly) dari browser pengguna.
 * 2. Mencari record WebSession yang aktif (belum di-revoke) di database.
 * 3. Jika valid, menyuntikkan objek session ke `req.session` untuk dipakai controller.
 * 4. Jika tidak valid / sudah di-revoke, mengembalikan 401 Unauthorized.
 *
 * @remarks
 * Cookie dikonfigurasi dengan `httpOnly: true`, `secure: true`, `sameSite: 'none'`
 * sesuai Section 12.4 URD (cross-domain antara frontend Vercel dan backend Vercel).
 *
 * @param req  - Express Request. Setelah lolos, `req.webSession` akan berisi data sesi.
 * @param res  - Express Response.
 * @param next - Lanjut ke handler berikutnya jika autentikasi berhasil.
 */
export const authSession = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken || typeof sessionToken != "string") {
        res.status(401).json({
            success: false,
            message: "Autentikasi gagal: session tidak ditemukan. Silahkan pairing ulang.",
        });
        return;
    }

    try {
        const pairingRepo = container.resolve<IPairingRepository>("IPairingRepository");
        const session = await pairingRepo.findSessionByToken(sessionToken);

        if (!session || session.revoked) {
            res.status(401).json({
                success: false,
                message: "Sesi tidak valid atau sudah di revoke. Silahkan pairing ulang.",
            });
            return;
        }

        (req as any).webSession = session;
        next();
    } catch (error) {
        next(error);
    }
}