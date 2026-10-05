// Builds the fixture app and prints the output as JSON.
// Runs in its own process: Vite does not load inside the `bun test` runtime.
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { build, type Rollup } from "vite";
import tailwindMangle, { type TailwindMangleOptions } from "../src/index.ts";

// RegExp values are passed as { regexp: "source" }
const options = JSON.parse(process.argv[2] ?? "{}", (_, value) =>
  value && typeof value === "object" && "regexp" in value ? new RegExp(value.regexp) : value,
) as Partial<TailwindMangleOptions>;

const output = (await build({
  root: resolve(import.meta.dir, "fixtures/app"),
  logLevel: "silent",
  build: { write: false, minify: false },
  plugins: [tailwindcss(), tailwindMangle({ css: "src/style.css", ...options })],
})) as Rollup.RollupOutput;

const text = (extension: string) =>
  output.output
    .filter((file) => file.fileName.endsWith(extension))
    .map((file) => (file.type === "chunk" ? file.code : String(file.source)))
    .join("\n");

const cssFiles = output.output.filter((file) => file.fileName.endsWith(".css")).map((file) => file.fileName);

process.stdout.write(JSON.stringify({ css: text(".css"), js: text(".js"), html: text(".html"), cssFiles }));
