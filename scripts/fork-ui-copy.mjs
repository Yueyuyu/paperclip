// Audit or connect known, static UI copy to i18next. Never transform user data,
// API enum values, routes, identifiers, or arbitrary runtime strings.
import fs from "node:fs";
import path from "node:path";
import { parseSync } from "oxc-parser";

const root = process.cwd();
const scopePath = path.join(root, "ui/src/i18n/fork-copy-scope.json");
const scope = JSON.parse(fs.readFileSync(scopePath, "utf8"));
const dictionaryPath = path.join(root, "ui/src/i18n/copy/zh-CN.json");
const dictionary = fs.existsSync(dictionaryPath) ? JSON.parse(fs.readFileSync(dictionaryPath, "utf8")) : {};
const displayProps = new Set(["label", "title", "subtitle", "description", "placeholder", "aria-label", "alt", "emptyMessage", "searchPlaceholder", "tooltip", "textBadge", "badgeLabel", "emptyTitle", "emptyDescription", "mobileTitle"]);
const retainedCopy = new Set(["&ldquo;", "&rdquo;", "&middot;", "&rarr;", "C", "g f", "SHA", "ID", "tok", "stderr", "stdout", "Grok Bot", "OpenAI Dot", "TOOLS.md", "/costs", "/path/to/project", "/absolute/path/to/agent/prompts", "status, id, updated", "feedbackDataSharingPreference", "instance_settings.general", '"prompt"']);

export function collectCopy(source, filename) {
  const parsed = parseSync(filename, source);
  if (parsed.errors.length) throw new Error(`${filename}: ${JSON.stringify(parsed.errors)}`);
  const copy = [];
  function visit(node, ancestors = []) {
    if (!node || typeof node !== "object") return;
    const parent = ancestors.at(-1);
    const text = node.type === "JSXText" ? node.value.replace(/\s+/g, " ").trim() : node.type === "Literal" && typeof node.value === "string" ? node.value : null;
    if (text && /[A-Za-z]/.test(text)) {
      let kind = null;
      if (node.type === "JSXText") kind = "jsx";
      else if (parent?.type === "JSXAttribute" && displayProps.has(parent.name.name)) {
        // AttributionAvatar's label also forms stable test/identity keys. Its
        // component localizes the display text while keeping this enum intact.
        if (!(parent.name.name === "label" && ancestors.at(-2)?.name?.name === "AttributionAvatar")) kind = "attribute";
      }
      else if (parent?.type === "Property" && parent.value === node && displayProps.has(parent.key.name ?? parent.key.value)) kind = "expression";
      else {
        // Conditional display text is allowed only inside JSX, never a condition
        // operand or a callback that could submit translated values to the API.
        let child = node;
        for (const ancestor of ancestors.toReversed()) {
          if (ancestor.type === "ConditionalExpression" && ancestor.test !== child) { child = ancestor; continue; }
          if (ancestor.type === "JSXExpressionContainer") {
            const owner = ancestors[ancestors.indexOf(ancestor) - 1];
            if (owner?.type !== "JSXAttribute" || displayProps.has(owner.name.name)) kind = "expression";
          }
          break;
        }
      }
      if (kind) copy.push({text, start:node.start, end:node.end, kind});
    }
    for (const [key,value] of Object.entries(node)) {
      if (key === "parent" || key === "comments") continue;
      if (Array.isArray(value)) value.forEach(child => visit(child,[...ancestors,node]));
      else if (value && typeof value === "object" && "type" in value) visit(value,[...ancestors,node]);
    }
  }
  visit(parsed.program);
  return copy;
}

const missing = new Map();
let connected = 0;
for (const filename of scope) {
  const fullPath = path.join(root, filename);
  let source = fs.readFileSync(fullPath,"utf8");
  for (const match of source.matchAll(/\btranslateUi\(("(?:[^"\\]|\\.)*")(?:\)|,)/g)) {
    const key = JSON.parse(match[1]);
    if (!Object.hasOwn(dictionary,key)) throw new Error(`${filename}: missing Chinese translation for ${key}`);
  }
  const copies = collectCopy(source, filename);
  const replacements = [];
  for (const copy of copies) {
    if (retainedCopy.has(copy.text)) continue;
    if (!(copy.text in dictionary)) {
      const files = missing.get(copy.text) ?? [];
      if (!files.includes(filename)) files.push(filename);
      missing.set(copy.text, files);
      continue;
    }
    const call = `translateUi(${JSON.stringify(copy.text)})`;
    const raw = source.slice(copy.start, copy.end);
    const prefix = copy.kind === "jsx" ? raw.match(/^\s*/)[0] : "";
    const suffix = copy.kind === "jsx" ? raw.match(/\s*$/)[0] : "";
    replacements.push({...copy, replacement: copy.kind === "expression" ? call : `${prefix}{${call}}${suffix}`});
  }
  if (process.argv.includes("--apply") && replacements.length) {
    for (const item of replacements.sort((a,b) => b.start-a.start)) source = source.slice(0,item.start)+item.replacement+source.slice(item.end);
    if (!/import\s*\{[^}]*\btranslateUi\b[^}]*\}\s*from\s*["']@\/i18n\/ui-copy["']/.test(source)) source = 'import { translateUi } from "@/i18n/ui-copy";\n' + source;
    fs.writeFileSync(fullPath,source);
    connected += replacements.length;
  }
}
const report = [...missing].map(([text,files]) => ({text,files}));
if (process.argv.includes("--json")) process.stdout.write(JSON.stringify(report,null,2)+"\n");
else console.log(JSON.stringify({scopedFiles:scope.length,connected,untranslatedStaticMessages:report.length}));
if (process.argv.includes("--check") && report.length) {
  console.error("New static UI copy needs translation. Run with --json to inspect it.");
  process.exitCode = 1;
}
