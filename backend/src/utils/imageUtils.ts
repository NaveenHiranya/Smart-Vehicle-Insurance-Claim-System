import path from 'path';
import sharp from 'sharp';

// Vision requests are dominated by image bytes: full-size phone photos are 3-8 MB
// each, which slows the model down and can exceed the API's inline-payload limit
// (the "400 Bad Request" on photo-heavy claims). Resizing to 1280px JPEG keeps all
// damage-relevant detail while cutting each image to roughly 100-300 KB.
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 80;

export interface GeminiImagePart {
  inlineData: { data: string; mimeType: string };
}

export function resolveUploadPath(filePath: string): string {
  // filePath is stored as e.g. /uploads/images/uuid.jpeg — resolve against UPLOAD_DIR
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  return path.resolve(uploadDir, filePath.replace(/^\/uploads\//, ''));
}

/**
 * Loads one image file and returns it as a compact Gemini inlineData part.
 * Returns null for missing or corrupt files (e.g. uploads dir lost on a
 * redeploy) so a single bad file never fails the whole scan.
 */
export async function loadImagePart(filePath: string): Promise<GeminiImagePart | null> {
  try {
    const buffer = await sharp(filePath)
      .rotate() // respect EXIF orientation from phone cameras
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return {
      inlineData: { data: buffer.toString('base64'), mimeType: 'image/jpeg' },
    };
  } catch (err) {
    console.warn(`[imageUtils] Skipping unreadable image ${path.basename(filePath)}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Selects up to maxImages files (damage closeups first — they carry the detail;
 * full-vehicle shots only fill the remaining slots for context), resolves each
 * against UPLOAD_DIR and resizes it for the AI request.
 */
export async function buildImageParts(
  files: { filePath: string; type?: string }[],
  maxImages: number,
): Promise<GeminiImagePart[]> {
  const closeups = files.filter((f) => f.type === 'DAMAGE_CLOSEUP');
  const others = files.filter((f) => f.type !== 'DAMAGE_CLOSEUP');
  const selected = [...closeups, ...others].slice(0, maxImages);

  const parts = await Promise.all(
    selected.map((f) => loadImagePart(resolveUploadPath(f.filePath))),
  );
  return parts.filter((p): p is GeminiImagePart => p !== null);
}
