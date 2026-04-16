/**
 * Simplified cryptographic utility functions for provably fair system
 * Uses Web Crypto API for secure random generation and hashing
 * Client-side only with nonce-based generation
 */

const STORAGE_KEYS = {
  CLIENT_SEED: 'slotmachine_client_seed',
  NONCE: 'slotmachine_nonce'
};

/**
 * Generate a cryptographically secure random seed (hex string)
 */
export async function generateSeed(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or generate client seed from localStorage
 */
export async function getOrCreateClientSeed(): Promise<string> {
  let seed = localStorage.getItem(STORAGE_KEYS.CLIENT_SEED);
  if (!seed) {
    seed = await generateSeed();
    localStorage.setItem(STORAGE_KEYS.CLIENT_SEED, seed);
  }
  return seed;
}

/**
 * Get current nonce from localStorage
 */
export function getNonce(): number {
  const nonce = localStorage.getItem(STORAGE_KEYS.NONCE);
  return nonce ? parseInt(nonce, 10) : 0;
}

/**
 * Increment nonce in localStorage
 */
export function incrementNonce(): number {
  const currentNonce = getNonce();
  const newNonce = currentNonce + 1;
  localStorage.setItem(STORAGE_KEYS.NONCE, newNonce.toString());
  return newNonce;
}

/**
 * Reset nonce (when rotating seed)
 */
export function resetNonce(): void {
  localStorage.setItem(STORAGE_KEYS.NONCE, '0');
}

/**
 * Rotate to a new client seed
 */
export async function rotateClientSeed(): Promise<string> {
  const newSeed = await generateSeed();
  localStorage.setItem(STORAGE_KEYS.CLIENT_SEED, newSeed);
  resetNonce();
  return newSeed;
}

/**
 * Generate a deterministic random number from client seed and nonce
 */
export async function seededRandom(clientSeed: string, nonce: number, index: number): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(clientSeed + nonce.toString() + index.toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convert first 4 bytes to a number between 0 and 1
  const value = (hashArray[0] * 0x1000000 + hashArray[1] * 0x10000 + hashArray[2] * 0x100 + hashArray[3]) / 0xffffffff;
  return value;
}
