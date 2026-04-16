import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically secure random seed (hex string)
 */
export function generateSeed(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a seed using SHA-256
 */
export function hashSeed(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

/**
 * Combine client seed and server seed to create a combined seed
 */
export function combineSeeds(clientSeed: string, serverSeed: string): string {
  return createHash('sha256')
    .update(clientSeed + serverSeed)
    .digest('hex');
}

/**
 * Generate a deterministic random number from combined seed
 */
export function seededRandom(combinedSeed: string, index: number): number {
  const hash = createHash('sha256')
    .update(combinedSeed + index.toString())
    .digest('hex');
  
  // Convert first 8 hex chars to a number between 0 and 1
  const value = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  return value;
}
