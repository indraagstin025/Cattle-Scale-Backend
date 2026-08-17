import {
    getStandardAdgForBreed,
    BREED_ADG_STANDARDS
} from '../../../src/utils/breedStandards.util.js';

describe('breedStandards.util', () => {

    describe('BREED_ADG_STANDARDS dictionary', () => {
        it('harus memiliki standar ADG untuk ras-ras unggulan', () => {
            expect(BREED_ADG_STANDARDS['limousin']).toBe(1.2);
            expect(BREED_ADG_STANDARDS['simental']).toBe(1.1);
            expect(BREED_ADG_STANDARDS['brahman']).toBe(0.8);
            expect(BREED_ADG_STANDARDS['bali']).toBe(0.5);
            expect(BREED_ADG_STANDARDS['madura']).toBe(0.4);
            expect(BREED_ADG_STANDARDS['default']).toBe(0.7);
        });
    });

    describe('getStandardAdgForBreed', () => {
        it('harus mengembalikan target ADG yang tepat untuk pencocokan nama persis (lowercase)', () => {
            expect(getStandardAdgForBreed('limousin')).toBe(1.2);
            expect(getStandardAdgForBreed('simental')).toBe(1.1);
            expect(getStandardAdgForBreed('brahman')).toBe(0.8);
            expect(getStandardAdgForBreed('wagyu')).toBe(0.8);
            expect(getStandardAdgForBreed('bali')).toBe(0.5);
            expect(getStandardAdgForBreed('madura')).toBe(0.4);
        });

        it('harus mengabaikan huruf besar-kecil (case-insensitive) dan spasi ekstra', () => {
            expect(getStandardAdgForBreed('  LIMOUSIN  ')).toBe(1.2);
            expect(getStandardAdgForBreed('SiMenTal')).toBe(1.1);
            expect(getStandardAdgForBreed('   BALI   ')).toBe(0.5);
            expect(getStandardAdgForBreed('PO')).toBe(0.6);
        });

        it('harus mencocokkan ras melalui substring (misal variasi nama ras / persilangan)', () => {
            expect(getStandardAdgForBreed('Simental Cross')).toBe(1.1);
            expect(getStandardAdgForBreed('Sapi Limosin Super')).toBe(1.2);
            expect(getStandardAdgForBreed('Brahman F1')).toBe(0.8);
            expect(getStandardAdgForBreed('Sapi PO Kebumen')).toBe(0.6);
            expect(getStandardAdgForBreed('Sapi Bali Bibit')).toBe(0.5);
        });

        it('harus mengembalikan nilai default (0.7) jika input bernilai null, undefined, atau string kosong', () => {
            expect(getStandardAdgForBreed(null)).toBe(0.7);
            expect(getStandardAdgForBreed(undefined)).toBe(0.7);
            expect(getStandardAdgForBreed('')).toBe(0.7);
            expect(getStandardAdgForBreed('   ')).toBe(0.7);
        });

        it('harus mengembalikan nilai default (0.7) jika ras tidak dikenali', () => {
            expect(getStandardAdgForBreed('Ras Random Antah Berantah')).toBe(0.7);
            expect(getStandardAdgForBreed('Kambing Etawa')).toBe(0.7);
        });
    });
});
