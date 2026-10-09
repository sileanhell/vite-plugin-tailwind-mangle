# vite-plugin-tailwind-mangle

Vite plugin that renames Tailwind CSS classes to short opaque names in production builds.

```html
<!-- source -->
<div class="relative flex items-center justify-between border-b border-neutral-700">
<!-- build -->
<div class="w5 a1 z0 b1 q2 m2">
```

- **Consistent everywhere**: CSS, JS/JSX, server-rendered HTML and `index.html` get the same names, including frameworks that build client and SSR separately (SolidStart, TanStack Start, React Router, etc.).
- **Only real classes**: the class list comes from Tailwind itself, and only your source files are rewritten; `node_modules` is never touched.
- **Safe with ordinary strings**: outside class attributes a string is renamed only if *every* word in it is a class, so `"image/png"` or `type="hidden"` stay intact.
- **Dev untouched**: runs on `vite build` only.

Requires Tailwind CSS v4.1+ and Vite 5+.

## Install

The package is published on [JSR](https://jsr.io/@sileanhell/vite-plugin-tailwind-mangle):

```sh
npx jsr add -D @sileanhell/vite-plugin-tailwind-mangle   # npm / pnpm / yarn
bunx jsr add -D @sileanhell/vite-plugin-tailwind-mangle  # bun
deno add -D jsr:@sileanhell/vite-plugin-tailwind-mangle  # deno
```

## Usage

```ts
import tailwindcss from "@tailwindcss/vite";
import tailwindMangle from "@sileanhell/vite-plugin-tailwind-mangle";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid"; // or react(), preact(), ...

export default defineConfig({
  plugins: [
    tailwindcss(),
    tailwindMangle({ css: "src/styles.css", include: "src" }),
    solid(),
  ],
});
```

## Options

| Option            | Type                   | Default                                              | Description                                                                                     |
| ----------------- | ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `css`             | `string`               | — (required)                                         | Tailwind entry stylesheet (the one with `@import "tailwindcss"`), relative to the Vite root.    |
| `include`         | `string \| string[]`   | Vite root                                            | Directories whose `.js/.ts/.jsx/.tsx` files are rewritten. `node_modules` is always skipped.    |
| `preserve`        | `(string \| RegExp)[]` | `[]`                                                 | Classes that keep their names, e.g. ones added by third-party scripts or server-side HTML.     |
| `preserveCssKeywords` | `boolean`          | `true`                                               | Keep the names of classes that are also CSS values (`hidden`, `flex`, `absolute`, `ease-in-out`, `uppercase`, …), so `el.style.overflow = "hidden"` or `{ easing: "ease-in-out" }` are not broken. |
| `classAttributes` | `RegExp`               | `class`, `className`, `classList`, `*Class`, `*ClassName` | JSX attributes whose values are class lists. Props like `iconClass="p-2"` are covered by default. |
| `prefix`          | `string`               | `""`                                                 | Prepended to every generated name (`"tw-"` → `tw-a`, `tw-b`, …).                               |
| `verbose`         | `boolean`              | `false`                                              | Log every string renamed outside class attributes, and CSS classes left as is.                 |

## How it works

1. At build start the plugin compiles your Tailwind entry with `@tailwindcss/node`, collects every class in the output (utilities and your own classes such as `.card { @apply ... }`), sorts them and assigns short names. Sorting makes the map identical in every build environment without sharing state. Classes named inside arbitrary variants (`active` in `[&.active]:text-white`, `is-open` in `group-[.is-open]:block`) keep their names: they are usually set by a router or a UI library, whose code is not rewritten.
2. Before your framework compiles JSX, string literals in your sources are rewritten with Babel:
   - in class attributes (and any expression inside them, e.g. `cn(...)`, ternaries, template literals) every known class is renamed;
   - anywhere else a string is renamed only when all of its words are classes — this covers constants like `const button = "px-4 py-2 rounded"`.
3. Class selectors in the emitted CSS and `class` attributes in `index.html` are renamed with the same map.

## Limitations

- **Build class names from whole literals.** `"text-" + size` cannot be renamed (Tailwind cannot detect it either). Use full names: `size === "lg" ? "text-lg" : "text-sm"`.
- **A string made only of class names is treated as classes.** Classes named like CSS values (`hidden`, `visible`, `ease-in`, …) keep their names by default, so `el.style.visibility = "hidden"` works. Other words that happen to be classes are still renamed: `const state = "grow"` becomes `const state = "b"`. Add such words to `preserve` or avoid bare class names as non-class values.
- **JSX-based frameworks only.** Vue, Svelte and Astro templates are not processed.
- **Bundled CSS files only.** CSS inlined via `?inline` or CSS-in-JS is not processed.
- **Third-party CSS**: a class in a library stylesheet that coincides with a Tailwind class (e.g. `.hidden`) is renamed too, while the library's markup is not. Add it to `preserve`.
- **This is obfuscation, not protection.** It hides class names; the styles themselves stay visible in DevTools.

## License

MIT
