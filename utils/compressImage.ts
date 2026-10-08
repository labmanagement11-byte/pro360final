// Comprime una foto en el navegador antes de subirla: lado mayor máx. 1600 px, JPEG 0.8.
// Así una foto de teléfono (3–8 MB) queda en ~200–500 KB y el 1 GB gratis de Storage rinde.

export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_JPEG_QUALITY = 0.8;

type Drawable = { source: CanvasImageSource; width: number; height: number; close?: () => void };

async function loadDrawable(file: Blob): Promise<Drawable> {
  // createImageBitmap respeta la orientación EXIF (fotos verticales del teléfono).
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // Safari viejo: cae al <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la foto'));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    // La imagen ya está decodificada en memoria.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function compressImage(
  file: Blob,
  maxSide: number = PHOTO_MAX_SIDE,
  quality: number = PHOTO_JPEG_QUALITY
): Promise<Blob> {
  const drawable = await loadDrawable(file);
  try {
    const { width, height } = drawable;
    if (!width || !height) throw new Error('La foto está vacía');
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no permite procesar fotos');
    // Fondo blanco para PNG con transparencia (JPEG no tiene alfa).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(drawable.source, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('No se pudo comprimir la foto');
    return blob;
  } finally {
    drawable.close?.();
  }
}
