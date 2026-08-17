/**
 * Standar baku Average Daily Gain (ADG) dalam satuan Kg/hari untuk berbagai ras sapi.
 * Nilai ini merupakan referensi umum performa pertumbuhan.
 */
export const BREED_ADG_STANDARDS: Record<string, number> = {
  "limousin": 1.2,
  "limosin": 1.2, // variasi ejaan
  "simental": 1.1,
  "charolais": 1.2,
  "hereford": 1.1,
  "angus": 1.0,
  "brangus": 0.9,
  "brahman": 0.8,
  "wagyu": 0.8,
  "fh": 0.8, // Friesian Holstein jantan potong
  "holstein": 0.8,
  "ongole": 0.6,
  "po": 0.6, // Peranakan Ongole
  "bali": 0.5,
  "madura": 0.4,
  "aceh": 0.4,
  "jabres": 0.4,
  "pesisir": 0.35,
  "default": 0.7 // Nilai fallback untuk ras yang tidak terdaftar
};

/**
 * Mendapatkan standar baku ADG berdasarkan nama ras sapi.
 * Melakukan normalisasi string (lowercase) untuk pencocokan yang lebih fleksibel.
 *
 * @param breed - Nama ras sapi (misal: "Simental Cross")
 * @returns Target ADG baku (Kg/hari)
 */
export function getStandardAdgForBreed(breed?: string | null): number {
  if (!breed) return BREED_ADG_STANDARDS["default"];
  
  const normalizedBreed = breed.toLowerCase().trim();
  
  // Cari kecocokan substring jika tidak ada kecocokan persis
  for (const [key, value] of Object.entries(BREED_ADG_STANDARDS)) {
    if (key !== "default" && normalizedBreed.includes(key)) {
      return value;
    }
  }

  return BREED_ADG_STANDARDS["default"];
}
