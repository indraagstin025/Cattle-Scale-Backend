import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import type { IAnalyticsService } from "../interfaces/services/IAnalyticsService.js";

@injectable()
export class AnalyticsController {
    constructor(
        @inject("IAnalyticsService") private analyticsService: IAnalyticsService
    ) {}

    /**
     * Mengambil ringkasan KPI peternakan untuk halaman dashboard utama.
     * Menghitung total sapi aktif, rata-rata ADG peternakan (on-the-fly), dan jumlah device offline.
     *
     * @route   GET /api/v1/analytics/overview
     * @param   {Request}      req  - Express Request object
     * @param   {Response}     res  - Express Response berisi objek KPI { totalCattle, avgDailyGain, offlineDevicesCount }
     * @param   {NextFunction} next - Express NextFunction untuk meneruskan error ke handler global
     */
    public getOverview = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const overview = await this.analyticsService.getDashboardOverview();
            res.status(200).json({
                success: true,
                data: overview,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Mengambil tren pertumbuhan berat historis seekor sapi.
     * Setiap titik data dilengkapi ADG per sesi yang dihitung on-the-fly
     * dari selisih berat antar penimbangan.
     *
     * @route   GET /api/v1/analytics/growth/:cattleId
     * @param   {Request}      req               - Express Request object
     * @param   {string}       req.params.cattleId - UUID sapi yang ingin dilihat tren pertumbuhannya
     * @param   {Response}     res               - Express Response berisi array data timbangan + ADG
     * @param   {NextFunction} next              - Express NextFunction untuk meneruskan error ke handler global
     */
    public getGrowthTrend = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { cattleId } = req.params;
            const trend = await this.analyticsService.getCattleGrowthTrend(cattleId);
            res.status(200).json({
                success: true,
                data: trend,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Memprediksi pertumbuhan berat sapi menggunakan Regresi Linear + Ekstrapolasi.
     * Menghasilkan estimasi berat pada +30/+60/+90 hari ke depan dan estimasi tanggal panen.
     * Membutuhkan minimal 3 data timbangan dari ~2 bulan terakhir.
     *
     * @route   GET /api/v1/analytics/predict/:cattleId
     * @param   {Request}      req                  - Express Request object
     * @param   {string}       req.params.cattleId   - UUID sapi
     * @param   {string}       [req.query.daysAhead] - Horizon prediksi dalam hari (opsional, default: 90)
     * @param   {Response}     res                  - Express Response berisi GrowthPrediction (regresi + ekstrapolasi)
     * @param   {NextFunction} next                 - Express NextFunction untuk meneruskan error ke handler global
     */
    public predictGrowth = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { cattleId } = req.params;
            const daysAhead = req.query.daysAhead
                ? parseInt(req.query.daysAhead as string, 10)
                : 90;

            if (isNaN(daysAhead) || daysAhead <= 0) {
                res.status(400).json({
                    success: false,
                    message: "Parameter 'daysAhead' harus berupa angka positif.",
                });
                return;
            }

            const prediction = await this.analyticsService.predictGrowth(
                cattleId,
                daysAhead
            );

            res.status(200).json({
                success: true,
                data: prediction,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Mengambil performa pertumbuhan rata-rata per ras sapi (ADG)
     * dan membandingkannya dengan standar baku ADG untuk ras tersebut.
     *
     * @route   GET /api/v1/analytics/breeds/performance
     * @param   {Request}      req  - Express Request object
     * @param   {Response}     res  - Express Response berisi data performa ras
     * @param   {NextFunction} next - Express NextFunction untuk meneruskan error ke handler global
     */
    public getBreedPerformance = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const performance = await this.analyticsService.getBreedPerformance();
            res.status(200).json({
                success: true,
                data: performance,
            });
        } catch (error) {
            next(error);
        }
    };
}