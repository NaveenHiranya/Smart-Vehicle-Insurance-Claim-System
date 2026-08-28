/**
 * Resolves a stored upload path (e.g. /uploads/images/file.jpg) to a full URL.
 *
 * In development the Vite proxy forwards /uploads → localhost:5000, so the
 * relative path works as-is (VITE_API_URL is empty).
 * In production VITE_API_URL is the Railway backend origin, so we prepend it
 * so the browser fetches the file directly from Railway, not from Vercel.
 */
const API_ORIGIN = import.meta.env.VITE_API_URL || '';

export function uploadUrl(filePath: string | null | undefined): string {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath; // already absolute
  return `${API_ORIGIN}${filePath}`;
}
