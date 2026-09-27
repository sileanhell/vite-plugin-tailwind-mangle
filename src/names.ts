const FIRST = "abcdefghijklmnopqrstuvwxyz";
const REST = "0123456789abcdefghijklmnopqrstuvwxyz";

/** a, b, …, z, a0, …, z0, a1, …: a unique valid CSS identifier for every index. */
export function shortName(index: number): string {
  let name = FIRST[index % FIRST.length];
  // Bijective base-36 suffix, so every index maps to a distinct name
  for (let n = Math.floor(index / FIRST.length); n > 0; n = Math.floor((n - 1) / REST.length)) {
    name += REST[(n - 1) % REST.length];
  }
  return name;
}

/** Yields `prefix + shortName(i)`, skipping names that are already taken. */
export function* generateNames(prefix: string, taken: ReadonlySet<string>): Generator<string, never> {
  for (let index = 0; ; index++) {
    const name = prefix + shortName(index);
    if (!taken.has(name)) yield name;
  }
}
