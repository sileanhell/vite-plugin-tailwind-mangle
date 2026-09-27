import postcss, { type Rule } from "postcss";
import selectorParser from "postcss-selector-parser";

const isKeyframeStep = (rule: Rule) =>
  rule.parent?.type === "atrule" && /keyframes$/i.test((rule.parent as postcss.AtRule).name);

/** Every class used in the stylesheet's selectors, unescaped (`md:block`, not `md\:block`). */
export function collectCssClasses(css: string): Set<string> {
  const classes = new Set<string>();
  const collect = selectorParser((selectors) => {
    selectors.walkClasses((node) => {
      classes.add(node.value);
    });
  });
  postcss.parse(css).walkRules((rule) => {
    if (!isKeyframeStep(rule)) collect.processSync(rule.selector);
  });
  return classes;
}

/** Renames classes in selectors; classes missing from `map` are kept and reported. */
export function renameCssClasses(
  css: string,
  map: ReadonlyMap<string, string>,
): { css: string; unknown: Set<string> } {
  const unknown = new Set<string>();
  const rename = selectorParser((selectors) => {
    selectors.walkClasses((node) => {
      const renamed = map.get(node.value);
      if (renamed) node.value = renamed;
      else unknown.add(node.value);
    });
  });
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (!isKeyframeStep(rule)) rule.selector = rename.processSync(rule.selector);
  });
  return { css: root.toString(), unknown };
}
