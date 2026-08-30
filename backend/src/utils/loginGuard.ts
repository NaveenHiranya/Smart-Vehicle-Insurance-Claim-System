// In-memory failed-login tracker with temporary lockout (brute-force protection).
// Five failures within the window lock the key for LOCK_MS; a success resets it.
// State is per-process — restarting the server clears locks, and multi-instance
// deployments would need this backed by Redis.

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

// Unknown-email logins compare against this hash so response timing does not
// reveal whether an account exists (bcrypt cost matches real hashes)
export const TIMING_EQUALIZER_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), 12);

interface Attempt {
  count: number;
  firstAt: number;
  lockedUntil: number;
}

const attempts = new Map<string, Attempt>();

function pruneExpired(now: number): void {
  for (const [key, a] of attempts) {
    if (a.lockedUntil < now && now - a.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

// Milliseconds remaining on the lock, or 0 when the key is not locked
export function remainingLockMs(key: string): number {
  const a = attempts.get(key);
  if (!a) return 0;
  const now = Date.now();
  if (a.lockedUntil > now) return a.lockedUntil - now;
  if (now - a.firstAt > WINDOW_MS) attempts.delete(key); // window slid past
  return 0;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  if (attempts.size > 1000) pruneExpired(now);
  const a = attempts.get(key);
  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  a.count += 1;
  if (a.count >= MAX_FAILURES) a.lockedUntil = now + LOCK_MS;
}

export function recordSuccess(key: string): void {
  attempts.delete(key);
}
