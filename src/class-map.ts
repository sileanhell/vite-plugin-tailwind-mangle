import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { collectCssClasses } from "./css.ts";
import { generateNames } from "./names.ts";

export type ClassFilter = string | RegExp;

/**
 * Classes named exactly like CSS values. A bare `"hidden"` or `"ease-in-out"` outside a class attribute
 * may be a style value (`el.style.overflow = "hidden"`, `el.animate(frames, { easing: "ease-in-out" })`),
 * so these keep their names: the string is then correct whichever way it is used.
 */
export const CSS_KEYWORD_CLASSES: readonly ClassFilter[] = [
  // display
  "block",
  "inline",
  "inline-block",
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "contents",
  "flow-root",
  "list-item",
  /^(inline-)?table(-(caption|cell|column|column-group|footer-group|header-group|row|row-group))?$/,
  "hidden",
  // position
  "static",
  "fixed",
  "absolute",
  "relative",
  "sticky",
  // visibility
  "visible",
  "invisible",
  "collapse",
  // easing
  "ease-in",
  "ease-out",
  "ease-in-out",
  // font and text
  "italic",
  "underline",
  "overline",
  "line-through",
  "uppercase",
  "lowercase",
  "capitalize",
  "isolate",
];

export function matchesAny(name: string, patterns: readonly ClassFilter[]): boolean {
  return patterns.some((pattern) => (typeof pattern === "string" ? pattern === name : pattern.test(name)));
}

/**
 * Compiles the Tailwind entry the same way `@tailwindcss/vite` does and maps every class
 * found in the output to a short name. Classes are sorted first, so separate build
 * environments (client, SSR) that compute the map independently get identical names.
 */
export async function buildClassMap(options: {
  cssFile: string;
  root: string;
  prefix: string;
  preserve: readonly ClassFilter[];
}): Promise<Map<string, string>> {
  const compiler = await compile(await readFile(options.cssFile, "utf8"), {
    base: dirname(options.cssFile),
    onDependency: () => {},
  });
  const roots =
    compiler.root === "none"
      ? []
      : compiler.root === null
        ? [{ base: options.root, pattern: "**/*", negated: false }]
        : [{ ...compiler.root, negated: false }];
  const scanner = new Scanner({ sources: [...roots, ...compiler.sources] });
  const classes = collectCssClasses(compiler.build(scanner.scan()));

  // Generated names must not clash with classes that keep their original name
  const names = generateNames(options.prefix, classes);
  const map = new Map<string, string>();
  for (const name of [...classes].sort()) {
    // Preserved classes map to themselves: they still count as classes, so `"relative px-4"` gets renamed
    map.set(name, matchesAny(name, options.preserve) ? name : names.next().value!);
  }
  return map;
}
