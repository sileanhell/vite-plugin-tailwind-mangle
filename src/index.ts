/**
 * Vite plugin that renames Tailwind CSS classes to short opaque names in production builds,
 * consistently in CSS, JS/JSX, server-rendered HTML and `index.html`.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import tailwindcss from "@tailwindcss/vite";
 * import tailwindMangle from "@sileanhell/vite-plugin-tailwind-mangle";
 * import { defineConfig } from "vite";
 *
 * export default defineConfig({
 *   plugins: [
 *     tailwindcss(),
 *     // Before the framework plugin: strings are rewritten before JSX is compiled
 *     tailwindMangle({ css: "src/styles.css", include: "src" }),
 *   ],
 * });
 * ```
 *
 * @module
 */
import babel from "@babel/core";
import { resolve } from "node:path";
import process from "node:process";
import type { Plugin } from "vite";
import { renameStringsPlugin } from "./babel-plugin.ts";
import { buildClassMap, type ClassFilter } from "./class-map.ts";
import { renameCssClasses } from "./css.ts";

export type TailwindMangleOptions = {
  /** Tailwind CSS entry (the file with `@import "tailwindcss"`), relative to the Vite root. */
  css: string;
  /**
   * Directories whose JS/TS/JSX files are rewritten, relative to the Vite root.
   * `node_modules` is always skipped.
   * @default the Vite root
   */
  include?: string | string[];
  /** Classes that keep their names, e.g. ones toggled by third-party scripts. */
  preserve?: ClassFilter[];
  /**
   * JSX attributes whose values are class lists.
   * @default `class`, `className`, `classList` and props ending in `Class` / `ClassName`
   */
  classAttributes?: RegExp;
  /** Prepended to every generated name. Must start a valid CSS identifier. */
  prefix?: string;
  /** Log every string renamed outside class attributes. */
  verbose?: boolean;
};

export type { ClassFilter };

const DEFAULT_CLASS_ATTRIBUTES = /^(class|className|classList)$|Class(Name)?$/;
const SCRIPT_FILE = /\.[cm]?[jt]sx?$/;
const HTML_CLASS_ATTRIBUTE = /(\sclass\s*=\s*)(["'])(.*?)\2/gs;

const normalizePath = (path: string) => path.replaceAll("\\", "/");

/**
 * Production-only renaming of Tailwind classes to short opaque names (`flex items-center` → `a b`),
 * consistently in CSS, JS/JSX and `index.html`, across all build environments.
 */
export default function tailwindMangle(options: TailwindMangleOptions): Plugin {
  const prefix = options.prefix ?? "";
  if (prefix && !/^-?[A-Za-z_][\w-]*$/.test(prefix)) {
    throw new Error(`[tailwind-mangle] prefix "${prefix}" is not a valid CSS identifier start`);
  }
  const classAttributes = options.classAttributes ?? DEFAULT_CLASS_ATTRIBUTES;
  const verbose = options.verbose ?? false;

  let root = process.cwd();
  let includeDirs: string[] = [];
  let classMap: Promise<Map<string, string>> | undefined;

  const getClassMap = () =>
    (classMap ??= buildClassMap({
      cssFile: resolve(root, options.css),
      root,
      prefix,
      preserve: options.preserve ?? [],
    }));

  const isIncluded = (id: string) => {
    const file = normalizePath(id.split("?")[0]);
    return (
      SCRIPT_FILE.test(file) &&
      !file.includes("/node_modules/") &&
      includeDirs.some((dir) => file === dir || file.startsWith(`${dir}/`))
    );
  };

  return {
    name: "vite-plugin-tailwind-mangle",
    apply: "build",
    enforce: "pre",

    configResolved(config) {
      root = config.root;
      const include = options.include ?? ".";
      includeDirs = (Array.isArray(include) ? include : [include]).map((dir) =>
        normalizePath(resolve(root, dir)).replace(/\/$/, ""),
      );
    },

    buildStart() {
      // Recomputed per build so `--watch` picks up new classes; deterministic across environments
      classMap = undefined;
    },

    async transform(code, id) {
      if (!isIncluded(id)) return;
      const map = await getClassMap();
      const result = await babel.transformAsync(code, {
        filename: id.split("?")[0],
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        parserOpts: { plugins: ["jsx", "typescript"] },
        generatorOpts: { jsescOption: { minimal: true } },
        plugins: [
          renameStringsPlugin({
            map,
            classAttributes,
            verbose,
            warn: (message) => this.warn(`${message} (${id})`),
          }),
        ],
      });
      if (!result?.code) return;
      return { code: result.code, map: result.map };
    },

    async transformIndexHtml(html) {
      const map = await getClassMap();
      return html.replace(HTML_CLASS_ATTRIBUTE, (_, start: string, quote: string, value: string) => {
        const renamed = value
          .split(/(\s+)/)
          .map((part) => map.get(part) ?? part)
          .join("");
        return `${start}${quote}${renamed}${quote}`;
      });
    },

    async generateBundle(_, bundle) {
      const map = await getClassMap();
      for (const asset of Object.values(bundle)) {
        if (asset.type !== "asset" || !asset.fileName.endsWith(".css")) continue;
        const { css, unknown } = renameCssClasses(String(asset.source), map);
        asset.source = css;
        if (verbose && unknown.size) {
          this.warn(`${asset.fileName}: classes kept as is: ${[...unknown].join(", ")}`);
        }
      }
    },
  };
}
