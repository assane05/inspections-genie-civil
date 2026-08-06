/**
 * Compression d'image côté client avant stockage (sprint 9).
 *
 * Sans backend, les photos restent en data URL locale (brouillon localStorage +
 * file d'attente hors-ligne) — mais on les redimensionne et ré-encode en JPEG
 * pour limiter la volumétrie, ce qui est la partie de la compression réalisable
 * côté front. Le "stockage objets fiable" (upload réel, URLs publiques stables,
 * correction des vignettes cassées en URL localhost) nécessite un backend et
 * reste hors de portée tant que celui-ci n'existe pas — voir le README du sprint.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Lecture du fichier impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible"));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Repli : pas de canvas disponible, on garde l'image d'origine plutôt que d'échouer.
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
