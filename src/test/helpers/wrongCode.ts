/** A six-digit code that is certainly not `code`. */
export function wrongCodeFor(code: string): string {
  return code === '000000' ? '111111' : '000000';
}
