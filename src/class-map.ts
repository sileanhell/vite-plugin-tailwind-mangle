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
  "static",
  "fixed",
  "absolute",
  "relative",
  "sticky",
  "visible",
  "invisible",
  "collapse",
  "ease-in",
  "ease-out",
  "ease-in-out",
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

const SELECTOR_CLASS = /\.(-?[A-Za-z_][\w-]*)/g;

/**
 * Classes named inside arbitrary variants (`[&.active]:text-white`, `group-[.is-open]:block`).
 * They are usually set by code the plugin does not rewrite (a router's active link, a UI library),
 * so they keep their names. Only names that are also classes in the CSS count, so `bg-[url(a.png)]`
 * does not keep `png`.
 */
export function classesInArbitraryVariants(classes: ReadonlySet<string>): Set<string> {
  const found = new Set<string>();
  for (const name of classes) {
    if (!name.includes("[")) continue;
    for (const [, referenced] of name.matchAll(SELECTOR_CLASS)) {
      if (classes.has(referenced)) found.add(referenced);
    }
  }
  return found;
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
  const variantClasses = classesInArbitraryVariants(classes);

  const names = generateNames(options.prefix, classes);
  const map = new Map<string, string>();
  for (const name of [...classes].sort()) {
    const keep = variantClasses.has(name) || matchesAny(name, options.preserve);
    map.set(name, keep ? name : names.next().value!);
  }
  return map;
}
