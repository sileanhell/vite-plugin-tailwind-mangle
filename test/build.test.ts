import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { collectCssClasses } from "../src/css.ts";

type BuildOutput = { css: string; js: string; html: string };

/** Builds the fixture in a child process; see build-fixture.ts. RegExps go as { regexp }. */
async function buildFixture(options: object = {}): Promise<BuildOutput> {
  const child = Bun.spawn(["bun", resolve(import.meta.dir, "build-fixture.ts"), JSON.stringify(options)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`fixture build failed:\n${stderr}`);
  return JSON.parse(stdout);
}

describe("vite build", () => {
  test("renames classes consistently in CSS, JS and HTML", async () => {
    const { css, js, html } = await buildFixture();
    const cssClasses = collectCssClasses(css);

    for (const original of ["flex", "items-center", "bg-black", "card", "rounded-lg", "2xl:p-8", "hover:bg-blue-600", "w-1/2"]) {
      expect(cssClasses.has(original)).toBe(false);
    }

    const panel = js.match(/"([a-z0-9]+(?: [a-z0-9]+){3})"/)![1].split(" ");
    for (const name of panel) expect(cssClasses.has(name)).toBe(true);

    const bodyClasses = html.match(/<body class="([^"]+)"/)![1].split(" ");
    for (const name of bodyClasses) expect(cssClasses.has(name)).toBe(true);

    expect(js).toContain(`"image/png"`);
  });

  test("keeps preserved classes and applies the prefix", async () => {
    const { css, html } = await buildFixture({ preserve: ["flex", { regexp: "^items-" }], prefix: "tw-" });
    const cssClasses = collectCssClasses(css);
    expect(cssClasses.has("flex")).toBe(true);
    expect(cssClasses.has("items-center")).toBe(true);
    expect(html).toContain(`<div id="app" class="flex items-center">`);
    expect(html).toMatch(/<body class="tw-[a-z0-9]+ tw-[a-z0-9]+">/);
  });

  test("gives the same names in independent builds", async () => {
    const [first, second] = await Promise.all([buildFixture(), buildFixture()]);
    expect(second.css).toBe(first.css);
    expect(second.js).toBe(first.js);
  });
});
