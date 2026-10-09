import { describe, expect, test } from "bun:test";
import { classesInArbitraryVariants } from "../src/class-map.ts";

describe("classesInArbitraryVariants", () => {
  test("finds classes named inside arbitrary variants", () => {
    const classes = new Set([
      "[&.active]:text-white",
      "group-[.is-open]:block",
      "has-[.checked]:ring",
      "[&_.child]:p-2",
      "active",
      "is-open",
      "checked",
      "child",
      "flex",
    ]);
    expect([...classesInArbitraryVariants(classes)].sort()).toEqual(["active", "checked", "child", "is-open"]);
  });

  test("ignores dots in arbitrary values and names that are not classes", () => {
    const classes = new Set(["bg-[url(a.png)]", "w-[1.5rem]", "py-3.5", "[&.missing]:flex", "flex"]);
    expect(classesInArbitraryVariants(classes).size).toBe(0);
  });
});
