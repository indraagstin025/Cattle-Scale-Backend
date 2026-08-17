import { Request, Response, NextFunction } from "express";
import { container } from "../container/container.js";
import type { IDeviceRepository } from "../interfaces/repositories/IDeviceRepository.js";


/**
 * Middleware autentikasi berbasis API Key untuk endpoint IoT.
 *
 * Cara kerja:
 * 1. Membaca header `x-api-key` dari request ESP32.
 * 2. Mencari device yang memiliki API Key tersebut di database.
 * 3. Jika valid, menyuntikkan objek device ke `req.device` untuk dipakai controller.
 * 4. Jika tidak valid, mengembalikan 401 Unauthorized.
 *
 * @remarks
 * API Key di database disimpan sebagai raw string (bukan hash) sesuai implementasi
 * `DeviceService.generateApiKey()`. Jika kelak diubah ke hashed, sesuaikan di sini.
 *
 * @param req  - Express Request. Setelah lolos, `req.device` akan berisi data device.
 * @param res  - Express Response.
 * @param next - Lanjut ke handler berikutnya jika autentikasi berhasil.
 */
export const authApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
        res.status(401).json({
            success: false,
            message: "Autentikasi agagal: header 'x-api-key' tidak ditemukan",
        });
        return;
    }

    try {
        const deviceRepo = container.resolve<IDeviceRepository>("IDeviceRepository");
        const device = await deviceRepo.findByApiKey(apiKey);

        if (!device) {
            res.status(401).json({
                success: false,
                message: "Autentikasi gagal: API Key tidak valid atau perangkat tidak terdaftar.",
            });
            return;
        }

        // Suntikkan data device ke req agar controller bisa menggunakannya
        (req as any).device = device;
        next();
    } catch (error) {
        next(error);
    }
};
