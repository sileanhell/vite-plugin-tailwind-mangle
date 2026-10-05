import babel from "@babel/core";
import { describe, expect, test } from "bun:test";
import { renameStringsPlugin } from "../src/babel-plugin.ts";

const map = new Map([
  ["flex", "a"],
  ["hidden", "b"],
  ["p-4", "c"],
  ["md:block", "d"],
  ["text-sm", "e"],
  ["relative", "relative"],
]);

function transform(code: string) {
  const warnings: string[] = [];
  const result = babel.transformSync(code, {
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ["jsx", "typescript"] },
    generatorOpts: { jsescOption: { minimal: true } },
    plugins: [
      renameStringsPlugin({
        map,
        classAttributes: /^(class|className|classList)$|Class(Name)?$/,
        verbose: false,
        warn: (message) => warnings.push(message),
      }),
    ],
  });
  return { code: result!.code!, warnings };
}

describe("class attributes", () => {
  test("renames static values", () => {
    expect(transform(`<div class="flex p-4" />`).code).toContain(`class="a c"`);
    expect(transform(`<div className="flex p-4" />`).code).toContain(`className="a c"`);
    expect(transform(`<Panel dotsClass="hidden md:block" />`).code).toContain(`dotsClass="b d"`);
  });

  test("renames strings inside expressions", () => {
    const { code } = transform(`<div class={cn("flex", open && "hidden md:block", open ? "p-4" : "text-sm")} />`);
    expect(code).toContain(`cn("a", open && "b d", open ? "c" : "e")`);
  });

  test("renames known tokens next to unknown ones and warns", () => {
    const { code, warnings } = transform(`<div class="flex my-custom" />`);
    expect(code).toContain(`class="a my-custom"`);
    expect(warnings).toHaveLength(1);
  });

  test("renames template literal tokens but keeps fragments glued to interpolations", () => {
    const { code } = transform("<div class={`flex ${size}-4 p-4 text-${tone}`} />");
    expect(code).toContain("`a ${size}-4 c text-${tone}`");
  });

  test("renames classList keys", () => {
    expect(transform(`<div classList={{ "flex p-4": on }} />`).code).toContain(`"a c": on`);
  });

  test("treats callbacks inside class attributes as regular code", () => {
    expect(transform(`<div class={items.map((item) => pick(item, "hidden x"))} />`).code).toContain(`"hidden x"`);
  });
});

describe("other strings", () => {
  test("renames strings made only of classes", () => {
    expect(transform(`const BUTTON = "flex p-4";`).code).toContain(`const BUTTON = "a c";`);
  });

  test("treats preserved classes (mapped to themselves) as classes", () => {
    const { code } = transform(`const BOX = "relative p-4"; el.style.position = "relative";`);
    expect(code).toContain(`const BOX = "relative c";`);
    expect(code).toContain(`el.style.position = "relative";`);
  });

  test("leaves mixed or unknown strings intact", () => {
    const { code } = transform(`const a = "flex layout"; const b = "image/png";`);
    expect(code).toContain(`"flex layout"`);
    expect(code).toContain(`"image/png"`);
  });

  test("leaves non-class attributes, keys, imports and types intact", () => {
    const { code } = transform(`
      import x from "flex";
      type Mode = "hidden";
      const lookup = { hidden: 1, "flex": 2 };
      <input type="hidden" name="flex" class="hidden" />;
    `);
    expect(code).toContain(`from "flex"`);
    expect(code).toContain(`type Mode = "hidden"`);
    expect(code).toContain(`"flex": 2`);
    expect(code).toContain(`type="hidden" name="flex" class="b"`);
  });

  test("keeps non-ASCII text unescaped", () => {
    expect(transform(`const title = "Главная";`).code).toContain(`"Главная"`);
  });
});
