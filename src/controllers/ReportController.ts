import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import type { IAnalyticsService } from "../interfaces/services/IAnalyticsService.js";
import { generateAndUploadGrowthPdf } from "../utils/pdfExporter.util.js";

@injectable()
export class ReportController {
    constructor(
        @inject("IAnalyticsService") private analyticsService: IAnalyticsService,
    ) {}

    /**
     * Meng-ekspor laporan pertumbuhan sapi ke dalam format PDF.
     * Laporan mencakup:
     *  - Profil sapi (Tag ID, Nama, Ras, Umur, Status, Target Panen)
     *  - Ringkasan analitik (ADG Regresi, Slope, Intercept, R², Estimasi Panen)
     *  - Tabel riwayat penimbangan (Hari ke-, Tanggal, Berat)
     *
     * File PDF di-upload ke Supabase Storage (Private Bucket 'reports'),
     * lalu dikembalikan sebagai Signed URL yang valid selama 60 detik.
     *
     * @route   GET /api/v1/reports/export-pdf/:cattleId
     * @param   {string} req.params.cattleId - UUID sapi
     * @returns JSON { success, data: { downloadUrl, expiresInSeconds } }
     */
    public exportGrowthToPdf = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const { cattleId } = req.params;

            // Ambil data prediksi regresi (butuh min. 3 timbangan)
            const prediction = await this.analyticsService.predictGrowth(cattleId);

            // Ambil data historis timbangan untuk tabel
            const trendData = await this.analyticsService.getCattleGrowthTrend(cattleId);
            const historical = trendData.map((point, index) => ({
                dayIndex: index === 0 ? 0 : Math.round(
                    (new Date(point.weighedAt).getTime() - new Date(trendData[0].weighedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                ),
                weighedAt: new Date(point.weighedAt),
                weightKg: point.weight,
            }));

            // Identitas sapi (diambil dari data terbatas yang tersedia di analytics)
            const cattleInfo = {
                tagId: cattleId,
                name: null,
                breed: null,
                ageMonths: null,
                status: "active",
                targetWeightKg: null,
            };

            const downloadUrl = await generateAndUploadGrowthPdf(cattleInfo, historical, prediction);

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
