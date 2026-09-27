import { describe, expect, test } from "bun:test";
import { generateNames, shortName } from "../src/names.ts";

describe("shortName", () => {
  test("starts with single letters", () => {
    expect([0, 1, 25, 26, 27].map(shortName)).toEqual(["a", "b", "z", "a0", "b0"]);
  });

  test("is unique and a valid CSS identifier", () => {
    const names = Array.from({ length: 50_000 }, (_, i) => shortName(i));
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9]*$/);
  });
});

describe("generateNames", () => {
  test("skips taken names and applies the prefix", () => {
    const names = generateNames("tw-", new Set(["tw-a", "tw-c"]));
    expect([names.next().value, names.next().value, names.next().value]).toEqual(["tw-b", "tw-d", "tw-e"]);
  });
});
