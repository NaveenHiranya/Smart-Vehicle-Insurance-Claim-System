// JWT_SECRET presence is validated at startup (index.ts) — this helper keeps
// every sign/verify site failing loudly instead of silently signing with ''.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}
