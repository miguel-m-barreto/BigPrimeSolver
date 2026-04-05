export function getTargetRounds(bitLength: number): number {
  if (bitLength <= 128) return 16;
  if (bitLength <= 256) return 24;
  if (bitLength <= 512) return 32;
  if (bitLength <= 1024) return 40;
  if (bitLength <= 2048) return 48;
  if (bitLength <= 4096) return 56;
  if (bitLength <= 8192) return 64;
  if (bitLength <= 16384) return 72;
  return 80;
}