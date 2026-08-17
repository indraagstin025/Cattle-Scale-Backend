import { Request, Response, NextFunction } from "express";

/**
 * Middleware untuk memaksa seluruh traffic menggunakan HTTPS.
 *
 * Cara kerja:
 * - Membaca header `x-forwarded-proto` yang disisipkan oleh reverse proxy
 *   (Vercel, Nginx, dll.) untuk mendeteksi protokol asli request.
 * - Jika protokol adalah HTTP (bukan HTTPS), redirect permanen (301) ke HTTPS.
 * - Di environment `development`, middleware ini di-bypass agar localhost tetap bisa diakses.
 *
 * @remarks
 * Harus dipasang **sebelum** semua route di `app.ts`.
 *
 * @param req  - Express Request
 * @param res  - Express Response
 * @param next - Lanjut ke middleware berikutnya jika sudah HTTPS atau di development
 */
export const httpsRedirect = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (process.env.NODE_ENV !== "production") {
        return next();
    }

    const protocol = req.headers["x-forwarded-proto"] as string;
    if (protocol && protocol !== "https") {
        const httpsUrl = `https://${req.hostname}${req.originalUrl}`;
        res.redirect(301, httpsUrl);
        return;
    }

    next();
}