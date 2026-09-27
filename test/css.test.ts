import { describe, expect, test } from "bun:test";
import { collectCssClasses, renameCssClasses } from "../src/css.ts";

const CSS = [
  ".flex{display:flex}",
  ".md\\:block{display:block}",
  ".w-1\\/2{width:50%}",
  ".py-3\\.5{padding-block:calc(var(--spacing)*3.5)}",
  ".\\32 xl\\:p-8{padding:2rem}",
  ".bg-\\[url\\(a\\.png\\)\\]{background-image:url(a.png)}",
  ".prose.prose-lg{font-size:1.125rem}",
  ".group-hover\\:w-full:is(:where(.group):hover *){width:100%}",
  "@media (width>=48rem){.md\\:hidden{display:none}}",
  "@keyframes spin{0%{opacity:.5}50.5%{opacity:1}to{rotate:1turn}}",
  ".x{margin:.5rem;background:url(image.hidden.png)}",
].join("");

describe("collectCssClasses", () => {
  test("finds unescaped class names in every selector form", () => {
    expect([...collectCssClasses(CSS)].sort()).toEqual(
      [
        "2xl:p-8",
        "bg-[url(a.png)]",
        "flex",
        "group",
        "group-hover:w-full",
        "md:block",
        "md:hidden",
        "prose",
        "prose-lg",
        "py-3.5",
        "w-1/2",
        "x",
      ].sort(),
    );
  });
});

describe("renameCssClasses", () => {
  test("renames known classes and reports the rest", () => {
    const map = new Map([
      ["flex", "a"],
      ["2xl:p-8", "b"],
      ["prose", "c"],
      ["group", "d"],
      ["group-hover:w-full", "e"],
    ]);
    const { css, unknown } = renameCssClasses(CSS, map);
    expect(css).toContain(".a{display:flex}");
    expect(css).toContain(".b{padding:2rem}");
    expect(css).toContain(".c.prose-lg{");
    expect(css).toContain(".e:is(:where(.d):hover *)");
    expect(unknown.has("md:block")).toBe(true);
  });

  test("leaves values and keyframe steps untouched", () => {
    const { css } = renameCssClasses(CSS, new Map([["hidden", "z"], ["x", "y"]]));
    expect(css).toContain(".y{margin:.5rem;background:url(image.hidden.png)}");
    expect(css).toContain("50.5%{opacity:1}");
  });
});
