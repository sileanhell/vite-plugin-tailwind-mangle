import babel, { type NodePath, type PluginObj } from "@babel/core";

const { types: t } = babel;

export type RenameStringsOptions = {
  map: ReadonlyMap<string, string>;
  /** JSX attributes whose values are class lists. */
  classAttributes: RegExp;
  warn: (message: string) => void;
  verbose: boolean;
};

/**
 * Renames class names inside string literals:
 * - in class attribute values (and any expression inside them), every known token is renamed;
 * - anywhere else, a string is renamed only when *all* of its tokens are known classes,
 *   so class constants are handled and ordinary strings are left intact.
 */
export function renameStringsPlugin(options: RenameStringsOptions): PluginObj {
  const { map, classAttributes, warn, verbose } = options;

  const renameTokens = (value: string, isClassAttribute: boolean): string | undefined => {
    const parts = value.split(/(\s+)/);
    const words = parts.filter((part) => part.trim());
    const known = words.filter((word) => map.has(word));
    if (!known.length) return;
    if (known.length !== words.length) {
      if (!isClassAttribute) return;
      warn(`unknown classes left as is: ${words.filter((word) => !map.has(word)).join(" ")}`);
    }
    return parts.map((part) => map.get(part) ?? part).join("");
  };

  const isInClassAttribute = (path: NodePath) => {
    const attribute = path.findParent((parent) => parent.isJSXAttribute() || parent.isFunction());
    return (
      attribute !== null &&
      attribute.isJSXAttribute() &&
      t.isJSXIdentifier(attribute.node.name) &&
      classAttributes.test(attribute.node.name.name)
    );
  };

  const isNonValueString = (path: NodePath, inClassAttribute: boolean) => {
    const { node, parent, parentPath } = path;
    return (
      t.isImportDeclaration(parent) ||
      t.isExportAllDeclaration(parent) ||
      t.isExportNamedDeclaration(parent) ||
      t.isImportSpecifier(parent) ||
      t.isExportSpecifier(parent) ||
      t.isImportAttribute(parent) ||
      t.isTSLiteralType(parent) ||
      t.isTSExternalModuleReference(parent) ||
      t.isTSImportType(parent) ||
      (t.isCallExpression(parent) && (t.isImport(parent.callee) || t.isIdentifier(parent.callee, { name: "require" }))) ||
      ((t.isObjectProperty(parent) || t.isObjectMethod(parent)) && parent.key === node && !inClassAttribute) ||
      (parentPath?.isJSXAttribute() === true && !inClassAttribute)
    );
  };

  return {
    name: "tailwind-mangle-strings",
    visitor: {
      StringLiteral(path) {
        const inClassAttribute = isInClassAttribute(path);
        if (isNonValueString(path, inClassAttribute)) return;
        const renamed = renameTokens(path.node.value, inClassAttribute);
        if (renamed === undefined || renamed === path.node.value) return;
        if (verbose && !inClassAttribute) warn(`renamed string "${path.node.value}"`);
        path.node.value = renamed;
        path.node.extra = { raw: JSON.stringify(renamed), rawValue: renamed };
      },
      TemplateLiteral(path) {
        if (t.isTaggedTemplateExpression(path.parent) || !isInClassAttribute(path)) return;
        const { quasis } = path.node;
        quasis.forEach((quasi, index) => {
          const parts = quasi.value.raw.split(/(\s+)/);
          const last = parts.length - 1;
          const renamed = parts
            .map((part, i) => {
              const glued = (i === 0 && index > 0) || (i === last && index < quasis.length - 1);
              return glued ? part : (map.get(part) ?? part);
            })
            .join("");
          if (renamed !== quasi.value.raw) quasi.value = { raw: renamed, cooked: renamed };
        });
      },
    },
  };
}
