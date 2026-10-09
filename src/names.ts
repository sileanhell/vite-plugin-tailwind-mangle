const FIRST = "abcdefghijklmnopqrstuvwxyz";
const REST = "0123456789abcdefghijklmnopqrstuvwxyz";

export function shortName(index: number): string {
  let name = FIRST[index % FIRST.length];
  for (let n = Math.floor(index / FIRST.length); n > 0; n = Math.floor((n - 1) / REST.length)) {
    name += REST[(n - 1) % REST.length];
  }
  return name;
}

export function* generateNames(prefix: string, taken: ReadonlySet<string>): Generator<string, never> {
  for (let index = 0; ; index++) {
    const name = prefix + shortName(index);
    if (!taken.has(name)) yield name;
  }
}
