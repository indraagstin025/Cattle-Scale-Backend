import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import type { IWeightLogService } from "../interfaces/services/IWeightLogService.js";
import type { IAnalyticsService } from "../interfaces/services/IAnalyticsService.js";
import { generateAndUploadGrowthExcel } from "../utils/excelExporter.util.js";

@injectable()
export class WeightLogController {
    constructor(
        @inject("IWeightLogService") private weightLogService: IWeightLogService,
        @inject("IAnalyticsService") private analyticsService: IAnalyticsService,
    ) {}

    /**
     * Menerima dan memvalidasi log penimbangan (weigh-in) otomatis dari perangkat ESP32.
     * Meliputi logika idempotensi untuk mencegah rekaman bobot duplikat.
     * @route POST /api/v1/iot/weigh-in
     * @param {Request} req - Express Request object berisi data berat, tag RFID sapi, kestabilan, dll.
     * @param {Response} res - Express Response object mengembalikan log yang disimpan.
     * @param {NextFunction} next - Express NextFunction untuk error handling.
     */
    public processWeighIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const payload = req.body;
            const log = await this.weightLogService.processWeighIn(payload);
            res.status(201).json({ success: true, message: "Weigh-in processed", data: log });
        } catch (error) { next(error); }
    };

    /**
     * Mengambil riwayat data log penimbangan ternak dengan kemampuan filter rentang tanggal.
     * @route GET /api/v1/weights/history
     * @param {Request} req - Express Request object berisi query filters (seperti startDate, endDate).
     * @param {Response} res - Express Response object mengembalikan array log penimbangan.
     * @param {NextFunction} next - Express NextFunction untuk error handling.
     */
    public getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = req.query; 
            const history = await this.weightLogService.getHistory(filters);
            res.status(200).json({ success: true, data: history });
        } catch (error) { next(error); }
    };

    /**
     * Meng-ekspor data penimbangan + prediksi regresi linear seekor sapi ke dalam
     * file Excel berdasarkan template yang tersimpan di Supabase Storage.
     * File hasil ekspor juga di-upload ke bucket 'reports' dan dikembalikan
     * sebagai Signed URL yang valid selama 60 detik.
     *
     * @route   GET /api/v1/weights/export-excel/:cattleId
     * @param   {string} req.params.cattleId - UUID sapi
     * @returns JSON { success, data: { downloadUrl, expiresInSeconds } }
     */
    public exportGrowthToExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { cattleId } = req.params;

            // Ambil data prediksi regresi (butuh min. 3 timbangan)
            const prediction = await this.analyticsService.predictGrowth(cattleId);

            // Ambil data historis timbangan (untuk baris tabel aktual)
            const trendData = await this.analyticsService.getCattleGrowthTrend(cattleId);
            const historical = trendData.map((point, index) => ({
                dayIndex: index === 0 ? 0 : Math.round(
                    (new Date(point.weighedAt).getTime() - new Date(trendData[0].weighedAt).getTime()) / (1000 * 60 * 60 * 24)
                ),
                weighedAt: new Date(point.weighedAt),
                weightKg: point.weight,
            }));

            // Ambil identitas sapi dari DB
            // Note: getCattleGrowthTrend tidak return info sapi, kita gunakan data minimal dari trend
            const cattleInfo = {
                tagId: cattleId,
                name: null,
                breed: null,
                ageMonths: null,
                status: "active",
                targetWeightKg: null,
            };

            const downloadUrl = await generateAndUploadGrowthExcel(cattleInfo, historical, prediction);

            res.status(200).json({
                success: true,
                data: {
                    downloadUrl,
                    expiresInSeconds: 60,
                    message: "Signed URL hanya berlaku 60 detik. Segera buka atau download.",
                },
            });
        } catch (error) {
            next(error);
        }
    };
}
