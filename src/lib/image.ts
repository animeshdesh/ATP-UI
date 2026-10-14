const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1600;

/**
 * F-04: shrink receipt photos before upload (longest side 1600 px, JPEG 0.8).
 * Formats the browser can't decode (often HEIC) are sent as-is if they fit the 5 MB limit.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  if (file.size < 400 * 1024 && file.type !== 'image/heic') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.8),
    );
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

export const tooLarge = (b: Blob) => b.size > MAX_BYTES;
