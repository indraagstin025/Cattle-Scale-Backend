import { inject, injectable } from "tsyringe";
import { WeightLog } from "@prisma/client";
import type { IWeightLogService } from "../interfaces/services/IWeightLogService.js";
import type { IWeightLogRepository } from "../interfaces/repositories/IWeightLogRepository.js";
import type { ICattleRepository } from "../interfaces/repositories/ICattleRepository.js";
import type { IDeviceRepository } from "../interfaces/repositories/IDeviceRepository.js";

@injectable()
export class WeightLogService implements IWeightLogService {
    constructor(
        @inject('IWeightLogRepository') private weightLogRepo: IWeightLogRepository,
        @inject('ICattleRepository') private cattleRepo: ICattleRepository,
        @inject('IDeviceRepository') private deviceRepo: IDeviceRepository
    ) { }

    /**
     * Memproses data penimbangan yang dikirim oleh ESP32.
     * Melakukan validasi perangkat, pencarian data sapi, dan menjamin idempotensi data.
     */
    async processWeighIn(payload: {
        deviceCode: string;
        tagId: string;
        weight: number;
        isStable: boolean;
        weighedAt: Date;
        idempotencyKey?: string;
    }): Promise<WeightLog> {
        if (payload.idempotencyKey) {
            const existing = await this.weightLogRepo.findByIdempotencyKey(payload.idempotencyKey);
            if (existing) return existing;
        }

        const cattle = await this.cattleRepo.findByTagId(payload.tagId);
        if (!cattle) throw new Error(`Sapi dengan tag ${payload.tagId} tidak ditemukan`);

        const device = await this.deviceRepo.findByDeviceCode(payload.deviceCode);
        if (!device) throw new Error(`Device ${payload.deviceCode} tidak valid`);

        const log = await this.weightLogRepo.create({
            weight: payload.weight,
            isStable: payload.isStable,
            weighedAt: payload.weighedAt,
            idempotencyKey: payload.idempotencyKey,
            cattleId: cattle.id,
            deviceId: device.id,
        });

        await this.cattleRepo.update(cattle.id, {
            currentWeight: payload.weight
        });

        return log;
    }

    /**
     * Mendapatkan riwayat log penimbangan sapi, mendukung rentang waktu (startDate - endDate).
     */
    async getHistory(filters: { cattleId?: string; startDate?: Date; endDate?: Date; skip?: number; take?: number; }): Promise<WeightLog[]> {
        return this.weightLogRepo.findHistory(filters);
    }
}