import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import { SettingsService } from "../services/SettingsService.js";

@injectable()
export class SettingsController {
    constructor(@inject(SettingsService) private settingsService: SettingsService) {}

    /**
     * Mengambil semua pengaturan sistem (termasuk nilai default untuk key yang belum di-set).
     *
     * @route   GET /api/v1/settings
     * @returns Array { key, value, description }
     */
    public getAllSettings = async (
        req: Request, res: Response, next: NextFunction
    ): Promise<void> => {
        try {
            const settings = await this.settingsService.getAllSettings();
            res.status(200).json({ success: true, data: settings });
        } catch (error) { next(error); }
    };

    /**
     * Membuat atau memperbarui satu pengaturan sistem berdasarkan key.
     *
     * @route   PUT /api/v1/settings/:key
     * @body    { value: unknown, description?: string }
     * @returns Pengaturan yang baru diperbarui
     */
    public upsertSetting = async (
        req: Request, res: Response, next: NextFunction
    ): Promise<void> => {
        try {
            const { key } = req.params;
            const { value, description } = req.body;

            if (value === undefined) {
                res.status(400).json({ success: false, message: "Field 'value' wajib disertakan." });
                return;
            }

            const setting = await this.settingsService.upsertSetting(key, value, description);
            res.status(200).json({ success: true, message: "Setting berhasil diperbarui.", data: setting });
        } catch (error) { next(error); }
    };

    /**
     * Mengambil konfigurasi ambang batas spike detection saat ini.
     *
     * @route   GET /api/v1/settings/spike-threshold
     * @returns { thresholdKg, windowSeconds }
     */
    public getSpikeThreshold = async (
        req: Request, res: Response, next: NextFunction
    ): Promise<void> => {
        try {
            const threshold = await this.settingsService.getSpikeThreshold();
            res.status(200).json({ success: true, data: threshold });
        } catch (error) { next(error); }
    };

    /**
     * Monitoring kapasitas dan status koneksi semua device ESP32.
     * Menampilkan berapa lama setiap device tidak mengirim sinyal (heartbeat),
     * dan memberi peringatan (`isLate: true`) jika melebihi batas yang dikonfigurasi.
     *
     * @route   GET /api/v1/settings/device-status
     * @returns Array status device dengan flag `isLate`
     */
    public getDeviceBufferStatus = async (
        req: Request, res: Response, next: NextFunction
    ): Promise<void> => {
        try {
            const status = await this.settingsService.getDeviceBufferStatus();
            const lateCount = status.filter((d) => d.isLate).length;

            res.status(200).json({
                success: true,
                data: {
                    devices: status,
                    summary: {
                        total: status.length,
                        lateDevices: lateCount,
                        allHealthy: lateCount === 0,
                    },
                },
            });
        } catch (error) { next(error); }
    };
}
