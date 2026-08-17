import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';

// Repositories
import { CattleRepository } from '../repositories/CattleRepository.js';
import { DeviceRepository } from '../repositories/DeviceRepository.js';
import { WeightLogRepository } from '../repositories/WeightLogRepository.js';
import { PairingRepository } from '../repositories/PairingRepository.js';
import { FirmwareRepository } from '../repositories/FirmwareRepository.js';

// Service
import { CattleService } from '../services/CattleService.js';
import { DeviceService } from '../services/DeviceService.js';
import { FirmwareService } from '../services/FirmwareService.js';
import { PairingService } from '../services/PairingService.js';
import { WeightLogService } from '../services/WeightLogService.js';
import { AnalyticsService } from '../services/AnalyticsService.js';

const prisma = new PrismaClient();
container.registerInstance('PrismaClient', prisma);

// 2. Registrasi semua Repositories (Mengaitkan Interface dengan Implementasi)
container.registerSingleton('ICattleRepository', CattleRepository);
container.registerSingleton('IDeviceRepository', DeviceRepository);
container.registerSingleton('IFirmwareRepository', FirmwareRepository);
container.registerSingleton('IPairingRepository', PairingRepository);
container.registerSingleton('IWeightLogRepository', WeightLogRepository);
// 3. Registrasi semua Services (Mengaitkan Interface dengan Implementasi)
container.registerSingleton('ICattleService', CattleService);
container.registerSingleton('IDeviceService', DeviceService);
container.registerSingleton('IFirmwareService', FirmwareService);
container.registerSingleton('IPairingService', PairingService);
container.registerSingleton('IWeightLogService', WeightLogService);
container.registerSingleton('IAnalyticsService', AnalyticsService);

export { container };