export function getBitLength(n: bigint): number {
  if (n <= 0n) {
    return 0;
  }

  return n.toString(2).length;
}