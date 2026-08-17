import { logger } from '../../../src/utils/logger.util.js';

describe('logger.util', () => {
    it('harus menginisialisasi pino logger dengan level dan fungsi standar', () => {
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });

    it('harus dapat memanggil method log tanpa melempar exception', () => {
        expect(() => {
            logger.info('Test log info');
            logger.debug('Test log debug');
            logger.warn('Test log warn');
        }).not.toThrow();
    });
});
