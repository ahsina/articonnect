/**
 * Normalise une image AVANT upload, côté navigateur :
 *  - convertit en JPEG (aplati les PNG/HEIC — les photos iPhone HEIC sont décodées par Safari) ;
 *  - redimensionne pour que la plus grande dimension ≤ maxDim (réduit fortement le poids) ;
 *  - ré-encode en JPEG qualité ~0.85.
 *
 * Le backend n'accepte que jpeg/png/webp/gif ≤ 5 Mo : sans cette étape, les photos de téléphone
 * (HEIC, ou > 5 Mo) étaient rejetées → « l'upload ne marche pas ». En cas d'échec de décodage
 * (navigateur incapable de lire le format), on renvoie le fichier d'origine : on ne bloque jamais.
 */
export async function normalizeImageForUpload(
  file: File,
  maxDim = 1920,
  quality = 0.85,
): Promise<File> {
  // On ne traite que les images. Un non-image repart tel quel.
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    return file;
  }

  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Fond blanc (les JPEG n'ont pas de transparence — évite un fond noir sur les PNG transparents).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    if ('close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') {
      (bitmap as ImageBitmap).close();
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    // Décodage impossible (ex. HEIC sur un navigateur non-Safari) → on n'empêche pas l'upload.
    return file;
  }
}

/** Charge le fichier en bitmap : createImageBitmap si possible, sinon repli via <img>. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* repli ci-dessous */
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    img.src = url;
  });
}
