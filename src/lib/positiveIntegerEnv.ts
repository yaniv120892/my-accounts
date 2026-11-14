/** A tunable limit from the environment; unset, empty or not a positive whole number gives `fallback`. */
export function positiveIntegerEnv({ name, fallback }: { name: string; fallback: number }): number {
  const configured = Number(process.env[name]);
  const isPositiveInteger = Number.isInteger(configured) && configured > 0;
  return isPositiveInteger ? configured : fallback;
}
